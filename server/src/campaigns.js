const express = require('express')
const multer = require('multer')
const { v4: uuidv4 } = require('uuid')
const db = require('./db')
const { ConnectionManagerInstance } = require('./connectionManager')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

function parseCsvLine(line = '') {
  const out = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      out.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  out.push(current.trim())
  return out.map((value) => value.replace(/^"(.*)"$/, '$1').trim())
}

function parseCsvContacts(text = '') {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase())
  const rows = lines.slice(1)

  return rows
    .map((line) => {
      const values = parseCsvLine(line)
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    })
    .map(normalizeContact)
    .filter(Boolean)
}

function normalizePhone(value = '') {
  const trimmed = String(value).trim()
  if (!trimmed) return ''
  return trimmed.replace(/[^\d+]/g, '')
}

function normalizeContact(input) {
  if (!input || typeof input !== 'object') return null

  const phone = normalizePhone(input.phone || input.mobile || input.number || input.whatsapp || input.contact)
  if (!phone) return null

  return {
    name: String(input.name || input.full_name || input.customer || '').trim() || null,
    phone,
    email: String(input.email || '').trim() || null,
    payload: JSON.stringify(input),
  }
}

function parseJsonContacts(text = '') {
  const parsed = JSON.parse(text)
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.contacts) ? parsed.contacts : []
  return rows.map(normalizeContact).filter(Boolean)
}

async function ensureCampaignOwnership(campaignId, userId) {
  const result = await db.pool.query('SELECT * FROM campaigns WHERE id=$1', [campaignId])
  if (!result.rows || !result.rows.length) return { error: 'not found', status: 404 }
  if (result.rows[0].user_id !== userId) return { error: 'forbidden', status: 403 }
  return { campaign: result.rows[0] }
}

function formatCampaignMessage(template = '', contact = {}) {
  const fallback = 'Hello! We wanted to reach out regarding our latest campaign.'
  const message = String(template || fallback)
  return message
    .replace(/\{\{\s*name\s*\}\}/gi, contact.name || 'there')
    .replace(/\{\{\s*phone\s*\}\}/gi, contact.phone || '')
    .replace(/\{\{\s*email\s*\}\}/gi, contact.email || '')
}

function toWhatsappJid(phone = '') {
  const normalized = normalizePhone(phone).replace(/^\+/, '')
  return `${normalized}@s.whatsapp.net`
}

async function stopCampaignRunner(campaignId) {
  await db.pool.query("UPDATE campaigns SET status='stopped', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [campaignId])
}

async function processCampaign(campaignId) {
  try {
    const campaignRes = await db.pool.query('SELECT * FROM campaigns WHERE id=$1', [campaignId])
    const campaign = campaignRes.rows && campaignRes.rows[0]
    if (!campaign) return
    if (!campaign.session_id) throw new Error('Campaign has no sending session')
    if (!['ready', 'running'].includes(String(campaign.status || '').toLowerCase())) return

    const pendingContactRes = await db.pool.query(
      "SELECT id,name,phone,email FROM campaign_contacts WHERE campaign_id=$1 AND send_status IN ('pending','failed') ORDER BY created_at ASC LIMIT 1",
      [campaignId]
    )
    const contact = pendingContactRes.rows && pendingContactRes.rows[0]

    if (!contact) {
      await db.pool.query("UPDATE campaigns SET status='completed', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [campaignId])
      return
    }

    await db.pool.query("UPDATE campaigns SET status='running', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [campaignId])

    try {
      await db.pool.query("UPDATE campaign_contacts SET send_status='sending' WHERE id=$1", [contact.id])
      const text = formatCampaignMessage(campaign.message_template, contact)
      await ConnectionManagerInstance.sendMessage(campaign.session_id, toWhatsappJid(contact.phone), text)
      await db.pool.query("UPDATE campaign_contacts SET send_status='sent' WHERE id=$1", [contact.id])
    } catch (error) {
      console.error('campaign send failed', { campaignId, contactId: contact.id, error: error && error.message })
      await db.pool.query("UPDATE campaign_contacts SET send_status='failed' WHERE id=$1", [contact.id])
    }
  } catch (error) {
    console.error('campaign processor failed', { campaignId, error: error && error.message })
    await db.pool.query("UPDATE campaigns SET status='failed', updated_at=CURRENT_TIMESTAMP WHERE id=$1", [campaignId]).catch(() => {})
  }
}

async function processReadyCampaigns() {
  try {
    const result = await db.pool.query(
      "SELECT id FROM campaigns WHERE status IN ('ready','running') ORDER BY updated_at ASC, created_at ASC"
    )
    for (const row of result.rows || []) {
      await processCampaign(row.id)
    }
  } catch (error) {
    console.error('processReadyCampaigns failed', error && error.message)
  }
}

router.get('/', async (req, res) => {
  try {
    const result = await db.pool.query(`
      SELECT c.*, s.contact_name AS session_name, s.phone_number AS session_phone,
             COUNT(cc.id) AS contacts_count
      FROM campaigns c
      LEFT JOIN sessions s ON s.id = c.session_id
      LEFT JOIN campaign_contacts cc ON cc.campaign_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id, s.contact_name, s.phone_number
      ORDER BY c.created_at DESC
    `, [req.user.sub])

    res.json({ campaigns: result.rows || [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, session_id, message_template, status } = req.body
    if (!name) return res.status(400).json({ error: 'Campaign name is required' })

    if (session_id) {
      const session = await db.pool.query('SELECT id,user_id FROM sessions WHERE id=$1', [session_id])
      if (!session.rows || !session.rows.length) return res.status(404).json({ error: 'Selected session not found' })
      if (session.rows[0].user_id !== req.user.sub) return res.status(403).json({ error: 'forbidden' })
    }

    const id = uuidv4()
    await db.pool.query(
      'INSERT INTO campaigns(id,user_id,session_id,name,message_template,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
      [id, req.user.sub, session_id || null, name, message_template || null, status || 'draft']
    )

    res.json({ ok: true, id })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const owned = await ensureCampaignOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })

    const contacts = await db.pool.query(
      'SELECT id,name,phone,email,payload,send_status,created_at FROM campaign_contacts WHERE campaign_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    )

    res.json({ campaign: owned.campaign, contacts: contacts.rows || [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const owned = await ensureCampaignOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })

    const { name, session_id, message_template, status } = req.body

    if (session_id) {
      const session = await db.pool.query('SELECT id,user_id FROM sessions WHERE id=$1', [session_id])
      if (!session.rows || !session.rows.length) return res.status(404).json({ error: 'Selected session not found' })
      if (session.rows[0].user_id !== req.user.sub) return res.status(403).json({ error: 'forbidden' })
    }

    if (name !== undefined) await db.pool.query('UPDATE campaigns SET name=$1 WHERE id=$2', [name, req.params.id])
    if (session_id !== undefined) await db.pool.query('UPDATE campaigns SET session_id=$1 WHERE id=$2', [session_id || null, req.params.id])
    if (message_template !== undefined) await db.pool.query('UPDATE campaigns SET message_template=$1 WHERE id=$2', [message_template || null, req.params.id])
    if (status !== undefined) {
      if (status === 'stopped') {
        await stopCampaignRunner(req.params.id)
      } else {
        await db.pool.query('UPDATE campaigns SET status=$1 WHERE id=$2', [status, req.params.id])
      }
    }
    await db.pool.query('UPDATE campaigns SET updated_at=CURRENT_TIMESTAMP WHERE id=$1', [req.params.id])

    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const owned = await ensureCampaignOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })
    await db.pool.query('DELETE FROM campaigns WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/:id/import-contacts', upload.single('file'), async (req, res) => {
  try {
    const owned = await ensureCampaignOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })
    if (!req.file) return res.status(400).json({ error: 'A CSV or JSON file is required' })

    const ext = (req.file.originalname.split('.').pop() || '').toLowerCase()
    const content = req.file.buffer.toString('utf8')
    let contacts = []

    if (ext === 'json') contacts = parseJsonContacts(content)
    else if (ext === 'csv' || ext === 'txt') contacts = parseCsvContacts(content)
    else return res.status(400).json({ error: 'Only CSV and JSON files are supported right now' })

    if (!contacts.length) {
      return res.status(400).json({ error: 'No valid contacts found. Use fields like phone, name, email.' })
    }

    const existing = await db.pool.query('SELECT phone FROM campaign_contacts WHERE campaign_id=$1', [req.params.id])
    const existingPhones = new Set((existing.rows || []).map((row) => normalizePhone(row.phone)))
    const uniqueContacts = contacts.filter((contact) => !existingPhones.has(contact.phone))

    for (const contact of uniqueContacts) {
      await db.pool.query(
        'INSERT INTO campaign_contacts(id,campaign_id,name,phone,email,payload,send_status,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)',
        [uuidv4(), req.params.id, contact.name, contact.phone, contact.email, contact.payload, 'pending']
      )
    }

    await db.pool.query('UPDATE campaigns SET updated_at=CURRENT_TIMESTAMP WHERE id=$1', [req.params.id])

    res.json({
      ok: true,
      imported: uniqueContacts.length,
      skipped: contacts.length - uniqueContacts.length,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id/contacts', async (req, res) => {
  try {
    const owned = await ensureCampaignOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })

    const contacts = await db.pool.query(
      'SELECT id,name,phone,email,payload,send_status,created_at FROM campaign_contacts WHERE campaign_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    )

    res.json({ contacts: contacts.rows || [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id/contacts/:contactId', async (req, res) => {
  try {
    const owned = await ensureCampaignOwnership(req.params.id, req.user.sub)
    if (owned.error) return res.status(owned.status).json({ error: owned.error })

    await db.pool.query('DELETE FROM campaign_contacts WHERE id=$1 AND campaign_id=$2', [req.params.contactId, req.params.id])
    await db.pool.query('UPDATE campaigns SET updated_at=CURRENT_TIMESTAMP WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
module.exports.processReadyCampaigns = processReadyCampaigns
