var SlackBot = require('slackbots');

// create a bot
var bot = new SlackBot({
  token: 'xoxb-323838434868-BH9VFkW8bYgY5hZp0RLEwyXM', // Add a bot https://my.slack.com/services/new/bot and put the token
  name: 'Kuma'
});

bot.on('message', function(data) {
  var params = {
    icon_emoji: ':bear:'
  };
  if(data.type == 'message' && data.username != 'Kuma') {
    bot.postMessageToChannel('bots', data.text, params);
  }
});
