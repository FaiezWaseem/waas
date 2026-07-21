const crypto = require('crypto')
const axios = require('axios')
const db = require('./db')

const DEFAULT_EVENTS = ['message.incoming']
const SUPPORTED_EVENTS = [
  'message.incoming',
  'message.outgoing',
  'session.status',
  'session.qr',
]

function parseEvents(raw) {
  if (!raw) return [...DEFAULT_EVENTS]
  if (Array.isArray(raw)) {
    return raw.map((e) => String(e).trim()).filter((e) => SUPPORTED_EVENTS.includes(e))
  }
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((e) => String(e).trim()).filter((e) => SUPPORTED_EVENTS.includes(e))
    }
  } catch (_e) {
    // comma-separated fallback
    return String(raw)
      .split(',')
      .map((e) => e.trim())
      .filter((e) => SUPPORTED_EVENTS.includes(e))
  }
  return [...DEFAULT_EVENTS]
}

function serializeEvents(events) {
  const list = parseEvents(events)
  return JSON.stringify(list.length ? list : DEFAULT_EVENTS)
}

function isValidWebhookUrl(url) {
  try {
    const parsed = new URL(String(url || ''))
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch (_e) {
    return false
  }
}

function signPayload(secret, body) {
  if (!secret) return null
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

async function listWebhooks(userId) {
  const r = await db.pool.query(
    'SELECT id, url, secret, events, is_active, created_at FROM webhooks WHERE user_id=$1 ORDER BY created_at DESC',
    [userId]
  )
  return (r.rows || []).map((row) => ({
    id: row.id,
    url: row.url,
    secret: row.secret ? '••••••••' : null,
    has_secret: !!row.secret,
    events: parseEvents(row.events),
    is_active: row.is_active === 1 || row.is_active === true || row.is_active === '1',
    created_at: row.created_at,
  }))
}

async function createWebhook(userId, { url, secret, events, is_active = true }) {
  if (!isValidWebhookUrl(url)) {
    throw new Error('url must be a valid http(s) URL')
  }

  const count = await db.pool.query('SELECT COUNT(*) as cnt FROM webhooks WHERE user_id=$1', [userId])
  const cnt = count.rows && count.rows[0] ? Number(count.rows[0].cnt) : 0
  if (cnt >= 20) throw new Error('Maximum of 20 webhooks allowed')

  const id = require('uuid').v4()
  await db.pool.query(
    'INSERT INTO webhooks(id,user_id,url,secret,events,is_active,created_at) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)',
    [id, userId, String(url).trim(), secret || null, serializeEvents(events), is_active ? 1 : 0]
  )
  return {
    id,
    url: String(url).trim(),
    secret: secret || null,
    events: parseEvents(events),
    is_active: !!is_active,
  }
}

async function updateWebhook(userId, id, patch = {}) {
  const existing = await db.pool.query('SELECT * FROM webhooks WHERE id=$1 AND user_id=$2', [id, userId])
  if (!existing.rows || !existing.rows.length) return null

  if (patch.url !== undefined) {
    if (!isValidWebhookUrl(patch.url)) throw new Error('url must be a valid http(s) URL')
    await db.pool.query('UPDATE webhooks SET url=$1 WHERE id=$2', [String(patch.url).trim(), id])
  }
  if (patch.secret !== undefined) {
    await db.pool.query('UPDATE webhooks SET secret=$1 WHERE id=$2', [patch.secret || null, id])
  }
  if (patch.events !== undefined) {
    await db.pool.query('UPDATE webhooks SET events=$1 WHERE id=$2', [serializeEvents(patch.events), id])
  }
  if (patch.is_active !== undefined) {
    await db.pool.query('UPDATE webhooks SET is_active=$1 WHERE id=$2', [patch.is_active ? 1 : 0, id])
  }

  const updated = await listWebhooks(userId)
  return updated.find((w) => w.id === id) || null
}

async function deleteWebhook(userId, id) {
  const r = await db.pool.query('DELETE FROM webhooks WHERE id=$1 AND user_id=$2', [id, userId])
  return (r.changes || r.rowCount || 0) > 0
}

async function getActiveWebhooksForEvent(userId, event) {
  const r = await db.pool.query(
    'SELECT id, url, secret, events FROM webhooks WHERE user_id=$1 AND is_active=1',
    [userId]
  )
  return (r.rows || []).filter((row) => parseEvents(row.events).includes(event))
}

async function postWebhook(url, payload, secret) {
  const body = JSON.stringify(payload)
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'WaaS-Webhooks/1.0',
    'X-WaaS-Event': payload.event,
    'X-WaaS-Delivery': payload.delivery_id,
  }
  const signature = signPayload(secret, body)
  if (signature) headers['X-WaaS-Signature'] = `sha256=${signature}`

  await axios.post(url, body, {
    headers,
    timeout: 8000,
    // body already stringified; axios will not re-stringify strings incorrectly with transformRequest default
    transformRequest: [(data) => data],
    validateStatus: (status) => status >= 200 && status < 300,
  })
}

/**
 * Fire-and-forget delivery of an event to all matching user webhooks
 * plus optional agent.webhook_url for message events.
 */
async function dispatch(userId, event, data = {}, options = {}) {
  if (!userId || !SUPPORTED_EVENTS.includes(event)) return

  const deliveryId = require('uuid').v4()
  const payload = {
    event,
    delivery_id: deliveryId,
    timestamp: new Date().toISOString(),
    data,
  }

  const targets = []

  try {
    const hooks = await getActiveWebhooksForEvent(userId, event)
    for (const hook of hooks) {
      targets.push({ url: hook.url, secret: hook.secret, source: 'webhook', id: hook.id })
    }
  } catch (e) {
    console.error('webhook list failed', e && e.message)
  }

  // Backward-compatible agent webhook_url for incoming messages
  if (event === 'message.incoming' && options.agentWebhookUrl && isValidWebhookUrl(options.agentWebhookUrl)) {
    targets.push({ url: options.agentWebhookUrl, secret: null, source: 'agent', id: null })
  }

  // Deduplicate by URL
  const seen = new Set()
  for (const target of targets) {
    if (!target.url || seen.has(target.url)) continue
    seen.add(target.url)
    postWebhook(target.url, payload, target.secret).catch((err) => {
      console.error(`webhook delivery failed (${event} → ${target.url}):`, err && err.message)
    })
  }
}

module.exports = {
  SUPPORTED_EVENTS,
  DEFAULT_EVENTS,
  parseEvents,
  serializeEvents,
  isValidWebhookUrl,
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  dispatch,
}
