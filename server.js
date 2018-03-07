var SlackBot = require('slackbots');
var http = require('http');

var fs = require('fs');
var token;
token = fs.readFileSync('./.env').toString().split('\n')[0];
console.log(token);

// create a bot
var bot = new SlackBot({
  token: token, // Add a bot https://my.slack.com/services/new/bot and put the token
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

// Bluemix で稼働する場合はポート番号を取得
var portno = process.env.PORT || 9080;
console.log("Listening on port ", portno);

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello World!');
  res.end();
}).listen(portno);
