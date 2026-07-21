const express = require('express')
const router = express.Router()
const webhooks = require('./webhooks')

// List webhooks for dashboard
router.get('/', async (req, res) => {
  try {
    const list = await webhooks.listWebhooks(req.user.sub)
    res.json({ webhooks: list, supported_events: webhooks.SUPPORTED_EVENTS })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { url, secret, events, is_active } = req.body || {}
    if (!url) return res.status(400).json({ error: 'url is required' })
    const hook = await webhooks.createWebhook(req.user.sub, { url, secret, events, is_active })
    res.status(201).json({ webhook: hook })
  } catch (e) {
    console.error(e)
    const status = /Maximum|valid http/i.test(e.message) ? 400 : 500
    res.status(status).json({ error: e.message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const hook = await webhooks.updateWebhook(req.user.sub, req.params.id, req.body || {})
    if (!hook) return res.status(404).json({ error: 'Webhook not found' })
    res.json({ ok: true, webhook: hook })
  } catch (e) {
    console.error(e)
    const status = /valid http/i.test(e.message) ? 400 : 500
    res.status(status).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const ok = await webhooks.deleteWebhook(req.user.sub, req.params.id)
    if (!ok) return res.status(404).json({ error: 'Webhook not found' })
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.post('/:id/test', async (req, res) => {
  try {
    const list = await webhooks.listWebhooks(req.user.sub)
    const hook = list.find((h) => h.id === req.params.id)
    if (!hook) return res.status(404).json({ error: 'Webhook not found' })

    await webhooks.dispatch(req.user.sub, 'message.incoming', {
      message_id: 'test_' + Date.now(),
      session_id: 'test-session',
      from: '0000000000@s.whatsapp.net',
      from_phone: '0000000000',
      text: 'WaaS webhook test payload',
      direction: 'in',
      test: true,
    })
    res.json({ ok: true, message: 'Test event dispatched (async delivery)' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
