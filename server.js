var SlackBot = require('slackbots');
var http = require('http');
var cfenv = require("cfenv");

var fs = require('fs');
var token;
token = fs.readFileSync('./.env').toString().split('\n')[0];
console.log(token);

// database
var mydb;
var history;

// load local VCAP configuration  and service credentials
var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log("Loaded local VCAP", vcapLocal);
} catch (e) { }

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}

const appEnv = cfenv.getAppEnv(appEnvOpts);
var cloudant;
if (appEnv.services['cloudantNoSQLDB'] || appEnv.getService(/cloudant/)) {
  // Load the Cloudant library.
  var Cloudant = require('cloudant');

  // Initialize database with credentials
  if (appEnv.services['cloudantNoSQLDB']) {
    // CF service named 'cloudantNoSQLDB'
    cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);
  } else {
    // user-provided service with 'cloudant' in its name
    cloudant = Cloudant(appEnv.getService(/cloudant/).credentials);
  }

  //database name
  var dbName = 'mydb';

  // Create a new "mydb" database.
  cloudant.db.create(dbName, function(err, data) {
    if(!err) //err if database doesn't already exists
      console.log("Created database: " + dbName);
  });

  // Specify the database we are going to use (mydb)...
  mydb = cloudant.db.use(dbName);

  var dbName = 'history';

  // Create a new "mydb" database.
  cloudant.db.create(dbName, function(err, data) {
    if(!err) //err if database doesn't already exists
      console.log("Created database: " + dbName);
  });

  // Specify the database we are going to use (mydb)...
  history = cloudant.db.use(dbName);
}

// create a bot
var bot = new SlackBot({
  token: token, // Add a bot https://my.slack.com/services/new/bot and put the token
  name: 'Kuma'
});
var params = {
  icon_emoji: ':bear:'
};

bot.on('message', function(data) {
  if(data.type == 'message' && data.username != 'Kuma') {
    // get
    if (data.text.includes('list')) {
      mydb.list({ include_docs: true }, function(err, body) {
        var names = [];
        if (!err) {
          body.rows.forEach(function(row) {
            if(row.doc.name){
              names.push(row.doc.name);
            }
          });
          history.list({ include_docs: true }, function(err, body) {
            var historys = [];
            if (!err) {
              body.rows.forEach(function(row) {
                if(row.doc.name){
                  historys.push(row.doc.name);
                }
              });
              filtered_names = names.filter((n) => !historys.includes(n))
              if(filtered_names.length == 0) {
                bot.postMessageToChannel('bots', '全員支払い完了！！！', params);
              } else {
                bot.postMessageToChannel('bots', '未払い者: ' + filtered_names.join(','), params);
              }
            }
          });
        }
      });
    } else {
      // register callback -> callback
      mydb.list({ include_docs: true }, function(err, body) {
        var names = [];
        if (!err) {
          body.rows.forEach(function(row) {
            if(row.doc.name){
              names.push(row.doc.name);
            }
          });
          // すでに入ってるやつは入れない
          var username = '';
          bot.getUsers()._value.members.forEach((row) => {
            if(row.id == data.user){
              username = row.real_name;
            }
          });
          if(!names.includes(username)) {
            mydb.insert({"name": username}, function(err, body, header) {
              if (err) {
                return console.log('[mydb.insert]', err.message);
              }
            });
          }

          history.list({ include_docs: true }, function(err, body) {
            var historys = [];
            if (!err) {
              body.rows.forEach(function(row) {
                if(row.doc.name){
                  historys.push(row.doc.name);
                }
              });
              if(!historys.includes(username)){
                history.insert({"name": username}, function(err, body, header) {
                  if (err) {
                    return console.log('[history.insert]', err.message);
                  }
                });
                bot.postMessageToChannel('bots', 'added payment history!', params);
              } else {
                bot.postMessageToChannel('bots', 'You have already paid!', params);
              }
            }
          });

        }
      });
    }
  }
});

// Bluemix で稼働する場合はポート番号を取得
var portno = process.env.PORT || 9080;

var express = require('express');
var app = express();

// HTTPリクエストを受け取る部分
app.get('/', function (req, res) {
  res.send('Hello World!');
});

// HTTPリクエストを受け取る部分
app.get('/clear', function (req, res) {
  cloudant.db.destroy('history', function(err) {
    cloudant.db.create('history', function() {
      history = cloudant.db.use('history');
      var now_date = new Date().getMonth() + 1
      bot.postMessageToChannel('bots', now_date + '月になりました．お金を払ったらここにつぶやいてください', params);
    });
  });
  res.send('clear');
});

// サーバーを起動する部分
var server = app.listen(portno, function () {
  console.log('started server');
});
