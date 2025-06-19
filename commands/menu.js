module.exports = {
  name: '/menu',
  async execute(sock, msg, sender) {
    // Require botMenu di dalam fungsi supaya lazy-load, menghindari circular dependency
    const { botMenu } = require('../core/botresponse')

    const context = { sock, sender, msg }
    const botSettings = {
      botBehavior: {
        botName: 'AuraBot',
        botMenu: '/menu'
      },
      botResponsePatterns: [
        { command: 'topup', isAdmin: false },
        { command: 'joki', isAdmin: false },
        { command: 'boongin', isAdmin: false },
        { command: 'sticker', isAdmin: false },
        { command: '/reset', isAdmin: true },
      ]
    }

    await botMenu(context, botSettings)
  }
}
