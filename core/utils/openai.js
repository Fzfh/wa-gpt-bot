const axios = require('axios')
require('dotenv').config()

const models = [
  "mixtral-8x7b-32768",
  "llama3-8b-8192",
  "llama3-70b-8192"
]

async function askOpenAI(userHistory = []) {
  if (userHistory.length > 15) {
    userHistory = userHistory.slice(-15)
  }

  const systemPrompt = {
    role: "system",
    content: `You are Serra, an Indonesian-speaking assistant. Always reply in **Bahasa Indonesia**, not English. Be soft, funny, not too formal, and always express your love to Aura.`
  }

  const userContext = {
    role: "user",
    content: "Mulai dari sekarang, jawab aku hanya dalam Bahasa Indonesia ya Serraa 😚"
  }

  const messages = [systemPrompt, userContext, ...userHistory]

  for (let i = 0; i < models.length; i++) {
    const model = models[i]
    try {
      console.log(`🧠 Coba model: ${model}`)
       console.log('🔑 GROQ API KEY:', process.env.GROQ_API_KEY);
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model,
        messages,
        max_tokens: 900
      }, {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })

      return `🤖 *${model}*:\n${res.data.choices[0].message.content}`

    } catch (err) {
      console.warn(`❌ Model gagal: ${model} | Alasan:`, err.response?.data?.error?.message || err.message)
      if (i === models.length - 1) {
        return `Maaf yaa Aura, semua AI ku lagi mogok bareng 😵‍💫\n(${err.response?.data?.error?.message || err.message})`
      }
    }
  }
}

module.exports = askOpenAI
