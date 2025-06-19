const fs = require('fs')
const path = require('path')
const { handleResponder } = require('./responder')

const commands = {}

// Load semua command dari folder commands/
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands'))
for (const file of commandFiles) {
  const cmd = require(`../commands/${file}`)
  if (cmd.name) commands[cmd.name] = cmd
}

async function handleMessage(sock, msg, greetedUsers) {
  const sender = msg.key.remoteJid
  const userId = msg.key.participant || msg.key.remoteJid

  const messageContent = msg.message?.conversation
    || msg.message?.extendedTextMessage?.text
    || msg.message?.imageMessage?.caption
    || ''

  // Cek command
  const command = commands[messageContent.toLowerCase()]
  if (command) {
    return await command.execute(sock, msg, sender)
  }

  // Auto responder
  await handleResponder(sock, msg, sender, userId, greetedUsers)
}

module.exports = { handleMessage }
