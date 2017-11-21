'use strict';

// Messenger API integration example
// We assume you have:
// * a Wit.ai bot setup (https://wit.ai/docs/quickstart)
// * a Messenger Platform setup (https://developers.facebook.com/docs/messenger-platform/quickstart)
// You need to `npm install` the following dependencies: body-parser, express, request.
//

const bodyParser = require('body-parser');
const express = require('express');
const request = require('request');
// get Bot, const, and Facebook API
const bot = require('./bot.js');
const Config = require('./const.js');
const FB = require('./facebook.js');
//text
const Text = require ('./text.js');
//questionnaire
const quest=require('./questionnaire.js');
//topic classification

//db
var MongoClient = require('mongodb').MongoClient;
var database="userProfile";
var url= "mongodb://"+Config.DB_USERNAME+ ":"+Config.DB_PASSWORD+"@testcluster-shard-00-00-k2ile.mongodb.net:27017,testcluster-shard-00-01-k2ile.mongodb.net:27017,testcluster-shard-00-02-k2ile.mongodb.net:27017/"+database+"?ssl=true&replicaSet=TestCluster-shard-0&authSource=admin";
const dbActions=require('./db.js');
const async=require('async');
const schedule = require('node-schedule');
// Setting up our bot
//const wit = bot.getWit();

// Webserver parameter
const PORT = process.env.PORT || 8445;

// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {
      fbid: fbid,
      context: {
        _fbid_: fbid
      }
    }; // set context, _fid_
  }
  return sessionId;
};

// Starting our webserver and putting it all together
const app = express();
app.set('port', PORT);
app.listen(app.get('port'));
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({limit: '5mb', extended: true}));


console.log("I'm wating for you @" + PORT);

// index. Let's say something fun
app.get('/', function(req, res) {
  res.send('"Only those who will risk going too far can possibly find out how far one can go." - T.S. Eliot');
});

// Webhook verify setup using FB_VERIFY_TOKEN
app.get('/webhook', (req, res) => {
  if (!Config.FB_VERIFY_TOKEN) {
    throw new Error('missing FB_VERIFY_TOKEN');
  }
  if (req.query['hub.mode'] === 'subscribe' &&
  req.query['hub.verify_token'] === Config.FB_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});


app.post('/history/save',function(req, res) {
  var data=req.body;
  var history=JSON.parse(data.historyItems);
  var user=data.user;
  var index,len=parseInt(data.length);

  MongoClient.connect(url, function(err, db) {
    assert.equal(err, null);
    console.log("Connected successfully to server");
    dbActions.updateHistory(db,user,history,function(message){
      res.send(message);
      console.log(message);
      db.close(function(){
        console.log("db closed");
      });
    });
  });
});

app.post('/history/lastupdate',function(req, res) {
  var data=req.body;
  var user=data.user;
  MongoClient.connect(url, function(err, db) {
    assert.equal(err, null);
    console.log("Connected successfully to server");
    dbActions.lastHistoryUpdate(db,user,function(lastSavedUrl){
      res.send(lastSavedUrl);
      db.close(function(){
        console.log("db closed");
      });
    });
  });
});

app.post('/charts/sessionsData',function(req, res) {
  var data=req.body;
  var user=data.user;
  MongoClient.connect(url, function(err, db) {
    assert.equal(err, null);
    console.log("Connected successfully to server");
    dbActions.getSessionsData(db,user,function(data){
      res.send(data);
      db.close(function(){
        console.log("db closed");
      });
    });
  });
});

app.post('/charts/topicsData',function(req, res) {
  var data=req.body;
  var user=data.user;
  MongoClient.connect(url, function(err, db) {
    assert.equal(err, null);
    console.log("Connected successfully to server");
    dbActions.getTopicsData(db,user,function(data){
      res.send(data);
      db.close(function(){
        console.log("db closed");
      });
    });
  });
});

app.post('/charts/topSites',function(req, res) {
  var data=req.body;
  var user=data.user;
  var action=data.action;
  MongoClient.connect(url, function(err, db) {
    assert.equal(err, null);
    console.log("Connected successfully to server");
    dbActions.getTopSites(db,user,action,function(data){
      res.send(data);
      db.close(function(){
        console.log("db closed");
      });
    });
  });
});


app.post('/profile/create',function(req, res) {
  var data=req.body;
  var user=data.user;
  var historyPercent=data.historyPercent;
  MongoClient.connect(url, function(err, db) {
    assert.equal(err, null);
    console.log("Connected successfully to server");
    if (historyPercent==13){
      console.log("all browsing history will be used to create profile");
    }
    else{
      console.log(historyPercent+" month/s of history will be used to create Profile");
    }
    dbActions.createProfile(db,user,historyPercent,function(message){
      console.log(message);
      db.close();

    });
    res.send("Profile will take some time to be created. Starting tommorrow you will be able to receive your personalized news feed.");
  });
});


app.post('/profile/delete',function(req, res) {
  var data=req.body;
  var user=data.user;
  MongoClient.connect(url, function(err, db) {
    assert.equal(err, null);
    console.log("Connected successfully to server");
    dbActions.deleteUser(db,user,function(message){
      console.log("deleted User "+user);
      res.send(message);
      db.close();

    });
  });
});



// The main message handler
app.post('/webhook', (req, res) => {
  // Parsing the Messenger API response
  // Yay! We got a new message!
  const messaging = FB.getFirstMessagingEntry(req.body);
  //  console.log(messaging);
  // We retrieve the Facebook user ID of the sender
  const sender = messaging.sender.id;
  const uri='https://graph.facebook.com/v2.6/'+sender+'?fields=first_name,last_name&access_token='+Config.FB_PAGE_TOKEN;
  // We retrieve the user's current session, or create one if it doesn't exist
  // This is needed for our bot to figure out the conversation history
  const sessionId = findOrCreateSession(sender);

  //in case the !is_echo doesnt solve the problem just block all the messages that have as their sender the bot's id
  if (messaging && messaging.message && !messaging.message.is_echo) {
    console.log(messaging);
    // We retrieve the message content
    const msg = messaging.message.text;
    const atts = messaging.message.attachments;
    const quickReply=messaging.message.quick_reply;

    if (atts) {
      // We received an attachment

      // Let's reply with an automatic message
      FB.fbMessage(
        sender,'Sorry I can only process text messages for now.'
      );
    }
    else if (quickReply){
      var payload=JSON.parse(quickReply.payload);
      switch(payload.id){
        case "START_QUESTIONNAIRE_PAYLOAD":
        quest.questionnaire(sender,0);
        break;
        case "QUESTIONNAIRE_ANSWER_PAYLOAD":
        var question={"questionNumber" : payload.questionNumber,"questionAnswer":payload.questionAnswer};
        request(uri, function(fbErr, response, body) {
          var fbProfInfo=JSON.parse(body);
          var owner=fbProfInfo.first_name+fbProfInfo.last_name;
          MongoClient.connect(url, function(err, db) {
            assert.equal(err, null);
            console.log("Connected successfully to server");
            dbActions.saveQuestionAnswer(db,owner,question,function(res){
              console.log(res);
              db.close(function(){
                console.log("db closed");
              });
            });
          });
        });
        if(payload.questionNumber<(Text.questions.length-1)){
          quest.questionnaire(sender,payload.questionNumber+1);
        }
        else{
          FB.fbMessage(
            sender,"You finished filling the questionnaire"
          );
        }
        break;
      }
    }
    else if (msg && !quickReply) {
      // We received a text message
      console.log(JSON.stringify(sessions[sessionId].context));
      // Let's forward the message to the Wit.ai Bot Engine
      // This will run all actions until our bot has nothing left to do
      bot.handleMessage(
        sessionId, // the user's current session
        msg, // the user's message
        sessions[sessionId].context, // the user's current session state
        function (context){
          if (context.error) {
            console.log('Oops! Got an error from Wit:', error);
          } else {
            // Our bot did everything it has to do.
            // Now it's waiting for further messages to proceed.
            console.log('Waiting for futher messages.');

            // Based on the session state, you might want to reset the session.
            // This depends heavily on the business logic of your bot.
            // Example:
            // if (context['done']) {
            //   delete sessions[sessionId];
            // }

            // Updating the user's current session state
            sessions[sessionId].context = context;
          }
        }
      );
    }
  }
  else if (messaging && messaging.postback){
    const postback=messaging.postback;
    const payload=JSON.parse(messaging.postback.payload);
    if(payload){

      switch(payload.id){
        case "GET_HELP_PAYLOAD" :
        FB.fbMessage(sender,Text.helpMessage);
        break;
        case "GET_STARTED_PAYLOAD" :
        FB.fbMessage(sender,"Send a greeting to start conversing or click help for additional info");
        break;
        case "RESET_PAYLOAD" :
        delete sessions[sessionId];
        FB.fbMessage(sender,"Session reseted");
        break;
        case "MORE_NEWS_PAYLOAD" :
        bot.moreNews({"_fbid_" : sender});
        break;
        case "LIKE_PAYLOAD" :
        request(uri, function(fbErr, response, body) {
          var fbProfInfo=JSON.parse(body);
          var owner=fbProfInfo.first_name+fbProfInfo.last_name;
          var like={};
          like.url=payload.url;
          like.domain=payload.domain;
          var d = new Date();
          like.date= d.getTime();
          MongoClient.connect(url, function(err, db) {
            assert.equal(err, null);
            console.log("Connected successfully to server");
            dbActions.updateLikes(db,owner,like,function(res){
              console.log(res);
              db.close(function(){
                console.log("db closed");
              });
            });
          });
        });
        break;
      }
    }
  }
  res.sendStatus(200);
});

var updateReadNews = function (){
  MongoClient.connect(url, function(err, db) {
    assert.equal(err, null);
    console.log("Connected successfully to server");
    db.collections().then(function(collections) {
      assert.ok(collections.length > 0);
      async.forEachOfSeries(collections, function (item,colIndex, callback) {
        var collection = collections[colIndex]
        dbActions.checkNewsReading(collection,function(){
          if (collections.length-1 == colIndex){
            callback("news updated");
          }
          else callback();
        });
      }, function (message) {
        console.log(message);
        db.close(function(){
          console.log("db closed");
        });
      });
    });
  });
}

var reEvaluation = function (){
  MongoClient.connect(url, function(err, db) {
    assert.equal(err, null);
    console.log("Connected successfully to server");
    db.collections().then(function(collections) {
      assert.ok(collections.length > 0);
      async.forEachOfSeries(collections, function (item,colIndex, callback) {
        var collection = collections[colIndex]
        dbActions.reEvaluation(collection,function(){
          if (collections.length-1 == colIndex){
            callback("Profiles Updated");
          }
          else callback();
        });
      }, function (message) {
        console.log(message);
        db.close(function(){
          console.log("db closed");
        });
      });
    });
  });
}

var findTimeReadingHabits = function (){
  MongoClient.connect(url, function(err, db) {
    assert.equal(err, null);
    console.log("Connected successfully to server");
    db.collections().then(function(collections) {
      assert.ok(collections.length > 0);
      async.forEachOfSeries(collections, function (item,colIndex, callback) {
        var collection = collections[colIndex]
        dbActions.findTimeReadingHabits(collection,function(){
          if (collections.length-1 == colIndex){
            callback("Analysed time reading habits");
          }
          else callback();
        });
      }, function (message) {
        console.log(message);
        db.close(function(){
          console.log("db closed");
        });
      });
    });
  });
}

var updateNewsSchedule = schedule.scheduleJob({hour: 15}, function(){
  updateReadNews();
});

var reEvaluationSchedule = schedule.scheduleJob({hour: 16}, function(){
  reEvaluation();
});

var timeReadingHabitsSchedule = schedule.scheduleJob({hour: 7, dayOfWeek: 17 }, function(){
  findTimeReadingHabits();
});
