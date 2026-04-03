const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const OpenAI = require('openai')

const defaultApiKey = process.env.OPENAI_API_KEY
const defaultBaseURL = process.env.OPENAI_BASE_URL
const defaultOpenAIModel = process.env.OPENAI_MODEL || 'gpt-4o-mini'

if (!defaultApiKey) {
  console.warn('OPENAI_API_KEY not set - OpenAI-backed AI features will fail until provided')
}

function normalizeMessages(systemPrompt = '', messages = []) {
  return [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    ...messages,
  ]
}

function requireApiKey(apiKey, provider) {
  if (!apiKey) throw new Error(`${provider} API key not configured`)
}

function resolveModelForProvider({ provider, model, baseURL, hasCustomApiConfig }) {
  const normalizedProvider = String(provider || 'openai').toLowerCase()
  const normalizedModel = String(model || '').trim()
  const normalizedBaseURL = String(baseURL || '').toLowerCase()

  if (normalizedProvider === 'claude') {
    return normalizedModel || 'claude-3-5-sonnet-latest'
  }

  if (normalizedProvider === 'gemini') {
    return normalizedModel || 'gemini-2.5-flash'
  }

  if (normalizedProvider === 'deepseek') {
    return normalizedModel || 'deepseek-chat'
  }

  if (normalizedProvider === 'openai_compatible') {
    return normalizedModel || 'custom-model'
  }

  // Built-in platform AI:
  // If the app is pointed at Pollinations, standard OpenAI model ids such as
  // gpt-4o-mini are rejected there. Use the provider alias they expect instead.
  if (!hasCustomApiConfig && normalizedBaseURL.includes('gen.pollinations.ai')) {
    if (!normalizedModel || normalizedModel === 'openai' || normalizedModel.startsWith('gpt-')) {
      return 'openai'
    }
  }

  if (!normalizedModel || normalizedModel === 'openai') {
    return defaultOpenAIModel
  }

  return normalizedModel
}

async function callOpenAICompatible({ model, systemPrompt, messages, apiKey, baseURL }) {
  requireApiKey(apiKey, 'OpenAI-compatible')

  const client = new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
  })

  const completion = await client.chat.completions.create({
    model,
    messages: normalizeMessages(systemPrompt, messages),
    max_tokens: 1024,
    temperature: 0.7,
  })

  if (completion.choices && completion.choices.length) {
    return completion.choices.map((c) => c.message && c.message.content).filter(Boolean).join('\n')
  }

  return null
}

async function callClaude({ model, systemPrompt, messages, apiKey, baseURL }) {
  requireApiKey(apiKey, 'Claude')

  const response = await fetch(`${baseURL || 'https://api.anthropic.com'}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt || undefined,
      max_tokens: 1024,
      messages: messages.map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      })),
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || 'Claude request failed')
  }

  if (Array.isArray(data?.content)) {
    return data.content.map((item) => item?.text).filter(Boolean).join('\n')
  }

  return null
}

async function callGemini({ model, systemPrompt, messages, apiKey, baseURL }) {
  requireApiKey(apiKey, 'Gemini')

  const endpointBase = baseURL || 'https://generativelanguage.googleapis.com'
  const payload = {
    contents: messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  }

  if (systemPrompt) {
    payload.systemInstruction = {
      parts: [{ text: systemPrompt }],
    }
  }

  const response = await fetch(
    `${endpointBase}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Gemini request failed')
  }

  const parts = data?.candidates?.[0]?.content?.parts || []
  return parts.map((part) => part?.text).filter(Boolean).join('\n') || null
}

async function chatCompletion({
  provider = 'openai',
  model = 'openai',
  systemPrompt = '',
  messages = [],
  apiKey,
  baseURL,
}) {
  const normalizedProvider = provider.toLowerCase()
  const resolvedApiKey = apiKey || defaultApiKey
  const resolvedBaseURL = baseURL || defaultBaseURL
  const resolvedModel = resolveModelForProvider({
    provider: normalizedProvider,
    model,
    baseURL: resolvedBaseURL,
    hasCustomApiConfig: Boolean(apiKey || baseURL),
  })

  try {
    if (normalizedProvider === 'claude') {
      return await callClaude({ model: resolvedModel, systemPrompt, messages, apiKey: resolvedApiKey, baseURL: resolvedBaseURL })
    }

    if (normalizedProvider === 'gemini') {
      return await callGemini({ model: resolvedModel, systemPrompt, messages, apiKey: resolvedApiKey, baseURL: resolvedBaseURL })
    }

    if (normalizedProvider === 'deepseek') {
      return await callOpenAICompatible({
        model: resolvedModel,
        systemPrompt,
        messages,
        apiKey: resolvedApiKey,
        baseURL: resolvedBaseURL || 'https://api.deepseek.com',
      })
    }

    if (normalizedProvider === 'openai_compatible') {
      return await callOpenAICompatible({
        model: resolvedModel,
        systemPrompt,
        messages,
        apiKey: resolvedApiKey,
        baseURL: resolvedBaseURL,
      })
    }

    return await callOpenAICompatible({
      model: resolvedModel,
      systemPrompt,
      messages,
      apiKey: resolvedApiKey,
      baseURL: resolvedBaseURL,
    })
  } catch (e) {
    console.error('AI Completion Error:', e?.message || e)
    throw e
  }
}

module.exports = { chatCompletion }
