const axios = require('axios')

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not set — AI features will fail until provided')
}

async function chatCompletion({ model='gpt-3.5-turbo', systemPrompt='', messages=[] }){
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')

  const payload = {
    model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages
    ],
    max_tokens: 1024,
    temperature: 0.7
  }

  const res = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  const data = res.data
  // return assistant text (concatenate if multiple choices)
  if (data && data.choices && data.choices.length) {
    return data.choices.map(c => c.message && c.message.content).filter(Boolean).join('\n')
  }
  return null
}

module.exports = { chatCompletion }
