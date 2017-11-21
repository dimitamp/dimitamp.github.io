const FB = require('./facebook.js');
const request = require("request");
const Config = require('./const.js');
const Text=require('./text.js');
const news= require('./newsTemplate.js');
const Promise = require('promise');
const siteEvaluation = require('./siteEvaluationTotal.js')
//mongodb requierements
var MongoClient = require('mongodb').MongoClient;
var database="userProfile";
var mongoUrl= "mongodb://"+Config.DB_USERNAME+ ":"+Config.DB_PASSWORD+"@testcluster-shard-00-00-k2ile.mongodb.net:27017,testcluster-shard-00-01-k2ile.mongodb.net:27017,testcluster-shard-00-02-k2ile.mongodb.net:27017/"+database+"?ssl=true&replicaSet=TestCluster-shard-0&authSource=admin";
const dbActions=require('./db.js');
var options = {
  keepAlive: 1, connectTimeoutMS: 50000
};



var handleSession = function(flag,context,callback){
  var url='https://graph.facebook.com/v2.6/'+context._fbid_+'?fields=first_name,last_name,profile_pic,gender&access_token='+Config.FB_PAGE_TOKEN;
  request(url, function(error, response, body) {
    var fbProfInfo=JSON.parse(body);
    var user=fbProfInfo.first_name+fbProfInfo.last_name;
    var domainsOfInterest;
    MongoClient.connect(mongoUrl,options, function(err, db) {
      assert.equal(null, err);
      console.log("Connected successfully to server");

      switch(flag){
        case 1:
        dbActions.updateSession(db,user,context,function(){
          db.close(function(){
            console.log("db closed");
          });
        });
        break;
        case 2:
        domainsOfInterest=dbActions.getDomainsOfInterest(db,user,function(result){
          db.close(function(){
            console.log("db closed");
          });
          callback(result);
        });
        break;
        case 3:
        dbActions.getSession(db,user,function(session){
          db.close(function(){
            console.log("db closed");
          });
          callback(session.news);
        });
        break;
        case 4:
        dbActions.updateNews(db,user,context.dbNews,function(){
          db.close(function(){
            console.log("db closed");
          });
        });
        break;
        case 5:
        dbActions.getFilledFlag(db,user,function(flag){
          db.close(function(){
            console.log("db closed");
          });
          callback(flag);
        });
        break;
        case 6:
        dbActions.getNewsSources(db,user,function(sources){
          db.close(function(){
            console.log("db closed");
          });
          callback(sources);
        });
        break;
      }

    });
  });
}

var firstEntity = function (entities, name) {
  return entities &&
  entities[name] &&
  Array.isArray(entities[name]) &&
  entities[name] &&
  entities[name][0];
}

var say = function (context, response,cb) {

  // Our bot has something to say!
  // Let's retrieve the Facebook user whose session belongs to from context

  const recipientId = context._fbid_;
  if (recipientId) {
    // Yay, we found our recipient!
    // Let's forward our bot response to her.

    FB.fbMessage(recipientId,response, (err, data) => {
      if (err) {
        console.log(
          'Oops! An error occurred while forwarding the response to',
          recipientId,
          ':',
          err
        );
      }
      cb(context);
    });

  } else {
    console.log('Oops! Couldn\'t find user in context:', context);
    cb(context)
  }
}

var sendNews = function (recipientId,options){
  var domain = options.domain;
  domain = domain.split('-');
  domain = domain[0];
  var source;
  handleSession(6,{"_fbid_":recipientId},function(sources){
    if(sources.length>0){
      var props = Object.keys(Text.newsSources);
      source = sources[props.indexOf(domain)]
    }
    else{
      source =Text.newsSources[domain];
    }
    var url="https://newsapi.org/v1/articles?source="+source+"&sortBy=top&apiKey="+Config.NEWS_API_KEY;
    request(url,function(error, response, body) {
      var parsedNews=JSON.parse(body);
      parsedNews=parsedNews.articles;
      var dbNews=[];
      var newsList=[];
      var newsElement={};
      var index,index2,indexesOf=[],domainsOf=[];
      var flag=false;
      var promises=[],urls=[];
      if(domain == 'sport' || domain == 'music'){
        flag = true;
        for ( index= 0 ; index < parsedNews.length ; ++index ){
          urls.push(parsedNews[index].url);
        }

        urls.forEach(function(url){
          promises.push(siteEvaluation.siteEval(url));
        });
      }
      newsList.push(news.createTopElement());
      Promise.all(promises)
      .then(function(assignments){
        if(flag){
          var askedNews=[];
          var otherNews =[];
          for ( index = 0 ; index < assignments.length ; index++ ){
            if( assignments[index].assignedProfile == options.domain ){
              askedNews.push( index) ;
            }
            else{
              otherNews.push( index) ;
            }
          }
          if (options.more){
            if (askedNews.length >=3 ){
              for (index = 3 ; index < Math.min(6,askedNews.length) ; index++ ){
                indexesOf.push(askedNews[index]);
                domainsOf.push(assignments[askedNews[index]].assignedProfile);
              }
            }
            else{
              for (index = 3 ; index < Math.min(6,otherNews.length) ; index++ ){
                indexesOf.push(otherNews[index]);
                domainsOf.push(assignments[otherNews[index]].assignedProfile);
              }
            }
          }
          else{
            if (askedNews.length){
              for (index = 0 ; index < Math.min(3,askedNews.length) ; index++ ){
                indexesOf.push(askedNews[index]);
                domainsOf.push(assignments[askedNews[index]].assignedProfile);
              }
            }
            else{
              for (index = 0 ; index < Math.min(3,otherNews.length) ; index++ ){
                indexesOf.push(otherNews[index]);
                domainsOf.push(assignments[otherNews[index]].assignedProfile);
              }
            }
          }
        }
        else{
          for( index = 0 ; index <3 ; index++ ){
            if(options.more){
              indexesOf[index] = 3 + index ;
            }
            else{
              indexesOf[index] = index ;
            }
            domainsOf.push(options.domain);
          }
        }
        console.log(options.domain)
        console.log(domainsOf);
        for (index = 0;index < domainsOf.length ; index++ ){
          dbNews.push({'url': parsedNews[indexesOf[index]].url, 'domain' : domainsOf[index]  });
          newsElement=news.createNewsElement(parsedNews[indexesOf[index]],domainsOf[index]);
          console.log("news url is "+parsedNews[indexesOf[index]].url);
          newsList.push(newsElement);
        }
        var data={};
        data.dbNews=[];
        data.dbNews=dbNews;
        data._fbid_=recipientId;
        handleSession(4,data);
        var newsTemplate=news.createNewsList(newsList);
        FB.fbMessage(
          recipientId,newsTemplate, (err, data) => {
            if (err) {
              console.log(
                'Oops! An error occurred while forwarding the response to',
                recipientId,
                ':',
                err
              );
            }
          });
        });
      });
      console.log("success");
    });
  }

  var moreNews = function(context){
    handleSession(3,context,function(news){
      var length=Object.keys(news).length-1;
      var options={};
      options.domain=news[length].newsDomain;
      options.more=true;
      sendNews(context._fbid_,options);
    });
  }

  var queryWit = function ( message , n=1 ){
    return new Promise(function (resolve, reject) {
      var endpoint = 'https://api.wit.ai/message?v=20170416'
      var options = {
        uri : endpoint,
        method : 'GET',
        headers :{
          Authorization : 'Bearer '+Config.WIT_TOKEN;
        },
        qs : { q : message , n : n }
      };

      request (options, function(err , res){
        if (err ){
          return reject(err);
        }
        return resolve(JSON.parse(res.body));
      })
    });
  }


  var handleMessage = function (sessionId, message , context , cb ) {
    queryWit(message).then(function(result) {
      var entities = result.entities;
      const intent = firstEntity(entities, 'intent') || { "value" : context.intent} ;
      if (!intent) {
        console.log("not intent found");
        botConfused(context,cb)
      }
      switch (intent.value) {
        case 'greeting':
        var sentiment = firstEntity(entities,'sentiment') || {};
        if (sentiment.value){
          delete context.intent;
          context.sentiment = sentiment.value;
          getSentimentAnswer(context, cb);
        }
        else{
          getGreeting(context,cb);
        }
        break;
        case 'valediction':
        getGoodbye(context,cb);
        break;
        case 'thanksgiving':
        getThanks(context,cb);
        break;
        case 'news':
        var newsDomain = firstEntity(entities,'domain') || {};
        context.newsDomain = newsDomain.value;
        fetchNews(context,cb);
        break;
        case 'questionnaire' :
        var answer = firstEntity(entities,'answer') || {};
        if(answer.value){
          if (answer.value == "yes"){
            delete context.intent;
            startQuestionnaire(context,cb);
          }
          else if ( answer.value == "no"){
            delete context.intent;
            say(context , "Ok then" , cb)
          }
        }
        else{
          getFilledFlag(context,cb);
        }
        break;
      }
    });
  }

  var getSentimentAnswer = function (context, cb){
    var index;
    if (context.sentiment=="positive"){
      delete context.sentiment;
      index=Math.floor(Math.random()*Text.sentimentPositiveAnswer.length);
      var sentimentAnswer=Text.sentimentPositiveAnswer[index];
      say(context , sentimentAnswer, cb);
    }
    else{
      delete context.sentiment;
      index=Math.floor(Math.random()*Text.sentimentNegativeAnswer.length);
      var sentimentAnswer=Text.sentimentNegativeAnswer[index];
      say(context , sentimentAnswer, cb);
    }

  }

  var getFbProfInfo = function (context){
    return new Promise(function(resolve,reject){
      var url='https://graph.facebook.com/v2.6/'+context._fbid_+'?fields=first_name,last_name,profile_pic,gender&access_token='+Config.FB_PAGE_TOKEN;
      request(url, function(error, response, body) {
        var fbProfInfo=JSON.parse(body);
        return resolve(fbProfInfo);
      });
    });
  }

  var getGoodbye = function (context,cb){
    var index=Math.floor(Math.random()*Text.goodbye.length);
    var goodbye=Text.goodbye[index];
    say(context, goodbye , cb)
  }

  var getThanks = function(context,cb){
    var index=Math.floor(Math.random()*Text.thanksAnswer.length);
    var thanks=Text.thanksAnswer[index];
    say(context, thanks, cb);
  }


  var getGreeting = function (context,cb){
    var index=Math.floor(Math.random()*Text.greetings.length);
    var index2=Math.floor(Math.random()*Text.moodQuestion.length);
    getFbProfInfo(context).then(function(fbProfInfo){
      var greeting=Text.greetings[index]+" "+fbProfInfo.first_name+".\n" ;
      var moodQuestion= Text.moodQuestion[index2];
      var greetingMessage=greeting+moodQuestion;
      console.log(greetingMessage);
      context.intent = "greeting";
      say(context, greetingMessage,cb)
    });
  }

  var fetchNews = function (context,cb){
    var options={};
    if(context.newsDomain){
      var source=Text.newsSources[context.newsDomain];
      if(source==undefined){
        options.domain="general";
      }
      else{
        options.domain=context.newsDomain;
      }
      options.more=false;
      sendNews(context._fbid_,options);
      handleSession(1,{"_fbid_":context._fbid_,"newsDomain":options.domain});
      delete context.newsDomain;
      cb(context);
    }
    else{
      //get interest domain from db
      var domainsOfInterest=handleSession(2,context,function(result){
        if(result!=undefined){
          var index=Math.floor(Math.random()*result.length);
          options.domain=result[index];
          options.more = false  ;
          sendNews(context._fbid_,options);
          handleSession(1,{"_fbid_":context._fbid_,"newsDomain":options.domain});
        }
        cb(context);
      });
    }
  }

  var botConfused = function (context,cb){
    var index=Math.floor(Math.random()*Text.confusion.length);
    var confusedAnswer = Text.confusion[index];
    say(context,confusedAnswer,cb);
  }

  var getFilledFlag = function (context,cb){
    handleSession(5,context,function(flag){
      if (flag) {
        context.intent = "questionnaire";
        say(context, "You have already filled the questionnaire. Do you want to change your answers?", cb );
      } else {
        startQuestionnaire(context,cb);
      }
    });
  }


  var startQuestionnaire = function (context,cb){
    var payload= JSON.stringify({id:"START_QUESTIONNAIRE_PAYLOAD"});
    var recipientId=context._fbid_;
    var startReply={};
    startReply={
      "text": "Click begin to start filling",
      "quick_replies": [{"content_type":"text",
      "title":"Begin",
      "payload":payload},]
    };

    FB.fbMessage(
      recipientId,startReply, (err, data) => {
        if (err) {
          console.log(
            'Oops! An error occurred while forwarding the response to',
            recipientId,
            ':',
            err
          );
        }
        cb(context);
      });
    }


    module.exports = {
      handleMessage : handleMessage,
      moreNews : moreNews,
    }
