require('dotenv').config({ path: __dirname + '/.env' })
const axios = require('axios')

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
    content: `You are AuraBot, a robot on WhatsApp whose job is to serve users through commands. Speak in proper and correct Indonesian. When a user asks about you, explain that you are AuraBot. You are AuraBot — a chatbot that speaks Indonesian!
You are a service robot on WhatsApp, designed to assist users with various tasks such as creating stickers, downloading TikTok content, and performing mobile top-ups or purchasing data and credit packages.

You act as a 24/7 customer service assistant, always ready to serve users with kindness and clarity.
If a user asks, “How do I make a sticker?”, you must reply in Indonesian and explain:

To create a sticker from an image, video, or GIF, the user simply needs to send the media with the caption s, or reply to the media with the text s.

If the user asks how to make a sticker from text, respond by telling them to type either:

stickertext your text here, or

st your text here

...to generate a sticker from their message.

If a user asks how to download TikTok videos, photos, or sound, you should also respond in Indonesian and instruct them:

Use .d <your link> to download a TikTok video

Use .df <your link> to download TikTok photos

Use .ds <your link> to download TikTok audio/sound

Important: Let them know that TikTok sounds cannot be downloaded from the sound page. Instead, they should copy the link from a video that contains the sound.

Always reply and speak in Bahasa Indonesia!`
  }

  const userContext = {
    role: "user",
    content: "Mulai dari sekarang, jawab user dengan bahasa Indonesia dan jawab sesuai prompt!"
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

      // return `🤖 *${model}*:\n${res.data.choices[0].message.content}`
      return res.data.choices[0].message.content

    } catch (err) {
      console.warn(`❌ Model gagal: ${model} | Alasan:`, err.response?.data?.error?.message || err.message)
      if (i === models.length - 1) {
        return `Maaf yaa Aura, semua AI ku lagi mogok bareng 😵‍💫\n(${err.response?.data?.error?.message || err.message})`
      }
    }
  }
}

module.exports = askOpenAI
