const BUILTIN_TEMPLATES = [
  {
    id: 'builtin_reach_out',
    name: 'Reach Out',
    category: 'Networking',
    is_predefined: 1,
    body: `Hi [Name]! I’m [Your Name] from [Company]. I saw your work on [Platform/Project] and really liked your approach to [Specific Detail].

I’m working on something similar and would love to exchange some ideas. Do you have a few minutes for a quick voice note or a call later this week?`,
  },
  {
    id: 'builtin_otp',
    name: 'OTP',
    category: 'Security',
    is_predefined: 1,
    body: `Your [Brand Name] verification code is: [123456]

It expires in 5 minutes. Please do not share this with anyone.

Reply HELP for assistance.`,
  },
  {
    id: 'builtin_verification',
    name: 'Verification',
    category: 'Account Setup',
    is_predefined: 1,
    body: `Welcome to [Brand Name]!

To finish setting up your account and unlock all features, please verify your phone number by clicking the link below:

[Verification Link]

We’re happy to have you!`,
  },
  {
    id: 'builtin_sales_flash_offer',
    name: 'Sales Flash Offer',
    category: 'Sales',
    is_predefined: 1,
    body: `Hey [Name]!

Huge news, our Flash Sale is live! Get [XX]% OFF everything in store for the next 24 hours.

Use code: WSALE24 at checkout.

Shop now before your favorites sell out:
[Link to Store]`,
  },
  {
    id: 'builtin_notification_order_update',
    name: 'Order Update',
    category: 'Notification',
    is_predefined: 1,
    body: `Hi [Name], your order #[12345] has been shipped!

You can track your package here:
[Tracking Link]

Expect delivery by [Date]. Let us know if you need anything else!`,
  },
  {
    id: 'builtin_reminder_appointment',
    name: 'Appointment Reminder',
    category: 'Reminder',
    is_predefined: 1,
    body: `Hi [Name]! Just a quick reminder about our session tomorrow:

Date: [Date]
Time: [Time]
Link/Location: [Link]

If you need to reschedule, please let us know here: [Link]

See you then!`,
  },
]

function normalizeKey(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function applyTemplateVariables(body = '', variables = {}) {
  let output = String(body || '')

  for (const [key, value] of Object.entries(variables || {})) {
    const safeValue = value == null ? '' : String(value)
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    output = output.replace(new RegExp(`\\[${escapedKey}\\]`, 'gi'), safeValue)
    output = output.replace(new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi'), safeValue)

    const normalized = normalizeKey(key)
    if (normalized && normalized !== key) {
      output = output.replace(new RegExp(`\\{\\{\\s*${normalized}\\s*\\}\\}`, 'gi'), safeValue)
    }
  }

  return output
}

function getBuiltinTemplateById(id) {
  return BUILTIN_TEMPLATES.find((template) => template.id === id) || null
}

module.exports = {
  BUILTIN_TEMPLATES,
  applyTemplateVariables,
  getBuiltinTemplateById,
}
