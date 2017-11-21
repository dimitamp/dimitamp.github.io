assert = require('assert');
const {serial , parallel} = require('items-promise');
const Promise = require('promise')
const siteEvaluation = require('./siteEvaluationTotal.js')
const chi = require('chi-squared');
//functions


var updateHistory = function(db,owner,historyItems,callback) {
  // Get the users collection
  var collection = db.collection(owner);
  collection.findOne({  id: "history" },function(err, res) {
    assert.equal(err, null);
    // if no history document then save the whole history as is
    if(res==null){
      collection.insertOne({id : "history",history : historyItems},function(error,result){
        assert.equal(error,null);
        callback("History Saved");
      });
    }
    else{
      //if there is a history document then this is a single url to be saved requested by the extension
      if(historyItems.length>=1){
        var updatedProfileScores={};
        var updatedProfileAccuracies={};
        var updatedHistory= res.history;
        var updatedUrlsUsed=res.urlsUsed;
        updatedUrlsUsed++;
        if(res.profileScores){
          updatedProfileScores= res.profileScores;
          updatedProfileAccuracies = res.profileAccuracies;
        }
        siteEvaluation.siteEval(historyItems[0].url).then(function(result){
          var assignment = result.assignedProfile;
          var accuracy = result.assignmentScore;
          historyItems[0].assignment= assignment;
          if(updatedProfileScores[assignment]!=undefined){
            updatedProfileAccuracies[assignment]= updatedProfileAccuracies[assignment] * updatedProfileScores[assignment] + accuracy;
            updatedProfileScores[assignment]++;
            updatedProfileAccuracies[assignment] = updatedProfileAccuracies[assignment]   / updatedProfileScores[assignment];
          }
          else{
            updatedProfileScores[assignment]=1;
            updatedProfileAccuracies[assignment]= accuracy;
          }

          //saving the updated history and scores
          updatedHistory.unshift(historyItems[0]);
          collection.updateOne({ id: "history" }
          , { $set: { history : updatedHistory , profileScores : updatedProfileScores,profileAccuracies: updatedProfileAccuracies, urlsUsed : updatedUrlsUsed }}, function(error, result) {
            assert.equal(error, null);
            callback("History Updated");
          });
        })
        .catch(function(promiseErr){ console.log(promiseErr) });
      }
      else{
        callback("History allready saved")
      }
    }
  });
}

var updateNews = function(db,owner,newsItems,callback) {
  // Get the users collection
  var collection = db.collection(owner);
  var d  = new Date();
  var time = d.getTime();
  var updatedNews=[];
  var news= [];
  news = newsItems;
  for (index=0 ; index <news.length ; index++){
    news[index].date = time;
  }
  collection.findOne({  id: "history" },function(err, res) {
    assert.equal(err, null);
    if(res.unreadNews){
      updatedNews=res.unreadNews;
      var length= news.length;
      for(index=0;index< length ; index++){
        updatedNews.unshift(news[length-1-index]);
      }
    }
    else{
      updatedNews=news;
    }
    collection.updateOne({ id: "history" }
    , { $set: { unreadNews : updatedNews }}, function(error, result) {
      assert.equal(error, null);
      callback("News Updated");
    });
  });
}

var checkNewsReading = function(collection,callback){
  console.log(" updating read news of collection");
  collection.findOne({  id: "history" },function(err, res) {
    assert.equal(err, null);
    if(res!=null){
      if(res.unreadNews && res.history){
        var unreadNews=[];
        var readNews=[];
        var numberOfArticlesPerDomain={};
        unreadNews=res.unreadNews;
        if(res.readNews){
          readNews=res.readNews;
        }
        if(res.numberOfArticlesPerDomain){
          numberOfArticlesPerDomain=res.numberOfArticlesPerDomain;
        }
        var article={};
        var d  = new Date();
        var now=d.getTime();
        var searchWindow=24*60*60*1000;
        var histIndex,newsIndex;
        histIndex=0;
        var histLen=Object.keys(res.history).length;
        var newsLen=Object.keys(unreadNews).length;
        var histElapsedTime= now - res.history[histIndex].lastVisitTime;
        var newsElapsedTime;
        while(histIndex<histLen && histElapsedTime <= searchWindow ){
          newsIndex=0;
          newsElapsedTime= now - unreadNews[newsIndex].date;
          while( newsIndex < newsLen && newsElapsedTime <= searchWindow ){
            if( res.history[histIndex].url == unreadNews[newsIndex].url && res.history[histIndex].runningTime >30){
              if(numberOfArticlesPerDomain[unreadNews[newsIndex].domain]!=undefined){
                numberOfArticlesPerDomain[unreadNews[newsIndex].domain]++;
              }
              else{
                numberOfArticlesPerDomain[unreadNews[newsIndex].domain]=1;
              }
              console.log("user read a "+ unreadNews[newsIndex].domain +" article for " + res.history[histIndex].runningTime+ " seconds");
              article=unreadNews[newsIndex];
              article.readingTime=res.history[histIndex].runningTime;
              readNews.unshift(article);
              unreadNews.splice(newsIndex,1);
              --newsLen;

            }
            newsIndex++;
            if(newsIndex<newsLen){
              newsElapsedTime= now - unreadNews[newsIndex].date;
            }
          }
          histIndex++;
          if(histIndex<histLen){
            histElapsedTime= now - res.history[histIndex].lastVisitTime ;
          }
        }
        collection.updateOne({ id: "history" }
        , { $set: { readNews : readNews , unreadNews : unreadNews, numberOfArticlesPerDomain : numberOfArticlesPerDomain}}, function(error, result) {
          assert.equal(error, null);
          callback();
        });
      }
      else{
        callback();
      }
    }
    else{
      callback();
    }
  });
}

var updateLikes = function(db,owner,like,callback) {
  // Get the users collection
  var collection = db.collection(owner);
  var numberOfLikesPerDomain={};
  var updatedLikes=[];
  var newLike={};
  newLike=like;
  collection.findOne({  id: "history" },function(err, res) {
    assert.equal(err, null);
    if(res.likes){
      updatedLikes=res.likes;
    }
    if(res.numberOfLikesPerDomain){
      numberOfLikesPerDomain=res.numberOfLikesPerDomain;
    }
    if(numberOfLikesPerDomain[newLike.domain]!=undefined){
      numberOfLikesPerDomain[newLike.domain]++;
    }
    else{
      numberOfLikesPerDomain[newLike.domain]=1;
    }
    updatedLikes.unshift(newLike);
    collection.updateOne({ id: "history" }
    , { $set: { likes : updatedLikes ,numberOfLikesPerDomain :numberOfLikesPerDomain }}, function(error, result) {
      assert.equal(error, null);
      callback("Likes Updated");
    });
  });
}


var lastHistoryUpdate = function(db,owner,callback){
  var collection = db.collection(owner);
  collection.findOne({id : "history"},function(err, result) {
    assert.equal(err, null);
    if(result==null){
      callback({"lastVisitTime":0});
    }
    else{
      callback(result.history[0]);
    }
  });
}

var getSession = function(db,owner,callback){
  var collection = db.collection(owner);
  collection.findOne({id:"sessions"},function(err, result) {
    assert.equal(err, null);
    var length=Object.keys(result.sessions).length-1;
    callback(result.sessions[length]);
  });
}

var deleteSession= function (db,owner,callback){
  var collection= db.collection(owner);
  collection.remove({id:"sessions"}, function(err, r) {
    assert.equal(null, err);
    console.log("User Sessions Deleted");
  });
}

var updateSession= function(db,owner,newContext,callback){
  var collection= db.collection(owner);
  var sessions=[];
  var session={};
  var d  = new Date();
  var date=d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
  var time=d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
  collection.findOne({  id: "sessions" },function(err, res) {
    assert.equal(err, null);
    if(res==null){
      session.date=date;
      session.sentiments=[];
      session.news=[];
      if(newContext.sentiment){
        session.sentiments.push({"time" : time, "sentiment" : newContext.sentiment});
      }
      if(newContext.newsDomain){
        session.news.push({"time" : time, "newsDomain" : newsContext.newsDomain});
      }
      sessions.push(session);
      collection.insertOne({id : "sessions",sessions : sessions},function(error,result){
        assert.equal(error,null);
        callback("Sessions Created");
      });
    }
    else{
      sessions=res.sessions;
      var length=Object.keys(sessions).length-1;
      if(sessions[length].date==date){
        session=sessions[length];
      }
      else{
        session.date=date;
        session.sentiments=[];
        session.news=[];
      }
      if(newContext.sentiment){
        session.sentiments.push({"time" : time, "sentiment" : newContext.sentiment});
      }
      if(newContext.newsDomain){
        session.news.push({"time" : time, "newsDomain" : newContext.newsDomain});
      }
      if(sessions[length].date==date){
        sessions[length]=session;
      }
      else{
        sessions.push(session);
      }
      collection.updateOne({ id: "sessions" }
      , { $set: { sessions : sessions }}, function(error, result) {
        assert.equal(error, null);
        callback("Sessions Updated");
      });
    }
  });
}


var createProfile = function(db,owner,historyPercent,callback){
  var collection= db.collection(owner);
  collection.findOne({id: "history"},function(error,result){
    assert.equal(error, null);
    var index,index2,assignment,accuracy;
    var urls=[];
    var historyItems=result.history;
    var timeLength=-1,length=Object.keys(historyItems).length;
    if(historyPercent!=13){
      //time range in milliseconds
      var d  = new Date();
      timeLength= d.getTime() - historyPercent * 30 * 24 * 60 * 60 * 1000 ;
      index=0;
      while ( index < Object.keys(historyItems).length && historyItems[index].lastVisitTime > timeLength ){
        index++;
      }
      length=index;
    }
    var webSiteFactor=1;
    var profileScores={};
    var profileAccuracies={};
    var batchLength=100;
    var batches=Math.ceil(length/batchLength);
    for( index = 0 ; index < batches; index++){
      var urlBatch=[];
      for( index2 = index*batchLength ; index2 < Math.min( (index+1)*batchLength , length ) ; index2++ ){
        if(historyItems[index2].url!='about:blank'){
          urlBatch.push(historyItems[index2].url);
        }
        urls[index]=urlBatch;
      }
    }
    console.log("number of batches: "+batches);
    console.time("eval");
    serial(urls, promiseBatching).then(function(results){
      for ( index = 0 ; index < results.length ; index++ ){
        assignment = results[index].assignedProfile;
        accuracy = results[index].assignmentScore;
        if (accuracy!=0){
          if ( profileScores[assignment]!=undefined){
            profileScores[assignment]+= webSiteFactor;
          }
          else{
            profileScores[assignment]=webSiteFactor;
          }
          if ( profileAccuracies[assignment]!=undefined){
            profileAccuracies[assignment]+= accuracy;
          }
          else{
            profileAccuracies[assignment]=accuracy;
          }
        }
      }
      console.log(profileScores);
      var properties = Object.keys(profileAccuracies);
      for (index = 0 ; index < properties.length ; index++){
        profileAccuracies[properties[index]]= profileAccuracies[properties[index]] / profileScores[properties[index]];
      }
      console.log(profileAccuracies);
      var domainsOfInterest = evalDomains(profileScores);
      console.log(domainsOfInterest);
      console.timeEnd("eval");
      collection.updateOne({  id: "profile" }
      , { $set: {monthsOfHistoryUsed : historyPercent ,  domainsOfInterest : domainsOfInterest , foundTimeReadingHabits : false }},{upsert:true} , function(err, res) {
        assert.equal(err, null);
      });
      collection.updateOne({ id: "history" }
      , { $set: { profileScores : profileScores , profileAccuracies : profileAccuracies ,domainScores : profileScores , urlsUsed :length }}, function(er, re) {
        assert.equal(er, null);
        callback("Profile  Created");
      });

    });
  });
}

var promiseBatching = function (urlBatch,previous){
  return new Promise(function(resolve,reject){
    if(previous==null){
      console.time("batch");
    }
    else{
      console.time("batch"+previous.length);
    }
    var promises=[];
    urlBatch.forEach(function(url){
      promises.push(siteEvaluation.siteEval(url));
    });
    Promise.all(promises)
    .then(function(assignments){
      if (previous==null){
        console.timeEnd("batch");
        return resolve(assignments);
      }
      else{
        console.timeEnd("batch"+previous.length);
        return resolve(previous.concat(assignments));
      }

    })

  });
}

var evalDomains = function(scores){
  var properties = Object.keys(scores).sort(function(a, b) {return -(scores[a] - scores[b])});
  properties.splice(properties.indexOf('noassignment'),1);
  var index,profile,profile0,profile1,domainsOfInterest=[];
  for ( index = 0 ; index <properties.length ; index++ ){
    if(properties[index]!=''){
      profile = (properties[index].match(/\d/));
      if(profile!=null){
        profile = properties[index].substring(0,profile['index']);
        profile0= profile+'0';
        profile1= profile+'1';
        if ( scores[profile0] && scores[profile1] ){
          if ( scores[profile0] > scores[profile1]){
            domainsOfInterest.push( profile0 );
            properties[index]='';
            properties[properties.indexOf(profile1)]='';

          }
          else{
            domainsOfInterest.push( profile1 );
            properties[index]='';
            properties[properties.indexOf(profile0)]='';
          }
        }
        else{
          domainsOfInterest.push(properties[index]);
          properties[index]='';
        }
      }
      else{
        domainsOfInterest.push(properties[index]);
        properties[index]=''
      }
    }
  }
  if(domainsOfInterest.length>5){
    domainsOfInterest = domainsOfInterest.slice(0,6);
  }
  return domainsOfInterest;
}


var getDomainsOfInterest = function(db,owner,callback){
  var collection = db.collection(owner);
  collection.findOne({id: "profile"},function(err,result){
    assert.equal(err,null);
    if(result!=null){
      if(result.foundTimeReadingHabits){
        var timeDomainHabits= result.timeDomainHabits;
        var d = new Date();
        var time = d.getHours();
        time = Math.floor(time/4);
        if(timeDomainHabits[time]!=null){
          callback([timeDomainHabits[time]]);
        }
        else{
          callback(result.domainsOfInterest);
        }
      }
      else{
        callback(result.domainsOfInterest);
      }
    }
    else{
      callback();
    }
  });

}

var getFilledFlag = function(db,owner,callback){
  var collection = db.collection(owner);
  var questionnaire={};
  questionnaire.filled=false;
  questionnaire.answers=[];
  collection.findOne({id: "history"},function(err,res){
    assert.equal(err,null);
    if(res.questionnaire){
      questionnaire=res.questionnaire;
      callback(questionnaire.filled);
    }
    else{
      collection.updateOne({  id: "history" }
      , { $set: { questionnaire : questionnaire }}, function(error, result) {
        assert.equal(error, null);
        callback(questionnaire.filled);
      });
    }
  });
}

var saveQuestionAnswer = function(db,owner,question,callback){
  var collection = db.collection(owner);
  var questionnaire={};
  collection.findOne({id: "history"},function(err,res){
    assert.equal(err,null);
    questionnaire=res.questionnaire;
    questionnaire.answers[question.questionNumber]=question.questionAnswer;
    questionnaire.filled=true;
    collection.updateOne({  id: "history" }
    , { $set: { questionnaire : questionnaire }}, function(error, result) {
      assert.equal(error, null);
      console.log("Answers updated");
    });
  });
}

var reEvaluation = function(collection,callback){
  collection.findOne({id: "history"},function(err,res){
    assert.equal(err,null);
    if(res!=null){
      if (res.profileScores!=undefined){
        var index,assignment,index2,properties;
        var urlsUsed= res.urlsUsed;
        var likes=res.likes;
        var readNews=res.readNews;
        var numberOfArticlesPerDomain= res.numberOfArticlesPerDomain;
        var numberOfLikesPerDomain= res.numberOfLikesPerDomain;
        var questionnaireDomain=res.questionnaire;
        var questionnaireFactor=1.1;
        var domainScores=res.profileScores;
        var urlsAssigned=0;
        properties = Object.keys(domainScores);
        for (index = 0 ; index < properties.length ; index++ ){
          if(properties[index]!='noassignment'){
            urlsAssigned+= domainScores[properties[index]];
          }
        }
        if(readNews){
          var newsWeight = 2 ;
          if(questionnaireDomain){
            newsWeight = questionnaireDomain.answers;
            newsWeight = parseFloat(newsWeight[12]);
          }
          var newsFactor = Math.ceil(urlsAssigned / ( readNews.length * newsWeight));
          properties=Object.keys(numberOfArticlesPerDomain);
          for (index = 0 ; index < properties.length ; index++){
            assignment=properties[index];
            if(numberOfArticlesPerDomain[assignment]>5){
              if ( domainScores[assignment]!=undefined){
                domainScores[assignment]+= numberOfArticlesPerDomain[assignment]*newsFactor;
              }
              else{
                domainScores[assignment]= numberOfArticlesPerDomain[assignment]*newsFactor;
              }
            }
          }
        }
        if(likes){
          properties=Object.keys(numberOfLikesPerDomain);
          var likesWeight = 4 ;
          var likeFactor = Math.ceil(urlsAssigned / (  likes.length * likesWeight ));
          for (index = 0 ; index < properties.length ; index++){
            assignment=properties[index];
            if(numberOfLikesPerDomain[assignment]>5){
              if ( domainScores[assignment]!=undefined){
                domainScores[assignment]+= numberOfLikesPerDomain[assignment]*likeFactor;
              }
              else{
                domainScores[assignment]= numberOfLikesPerDomain[assignment]*likeFactor;
              }
            }
          }
        }
        properties = Object.keys(domainScores);
        if(questionnaireDomain){
          questionnaireDomain=questionnaireDomain.answers;
          questionnaireDomain=questionnaireDomain[0];
          for ( index = 0 ; index < properties.length ; index++ ){
            assignment= properties[index];
            assignment = assignment.split('-');
            assignment = assignment[0];
            if ( assignment == questionnaireDomain){
              domainScores[properties[index]]= questionnaireFactor* domainScores[properties[index]];
            }
          }
        }
        var d = new Date();
        var date=d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
        var updatedDomainsOfInterest= evalDomains(domainScores);
        collection.updateOne({  id: "profile" }
        , { $set: { domainsOfInterest : updatedDomainsOfInterest , date : date}},{upsert:true} , function(error, result) {
          assert.equal(error, null);
        });
        collection.updateOne({ id: "history" }
        , { $set: { domainScores : domainScores , readNews : readNews , likes : likes  }}, function(er, re) {
          assert.equal(er, null);
          callback();
        });
      }
      else{
        callback();
      }
    }
    else{
      callback();
    }
  });
}

var getSessionsData = function (db,owner,callback){
  var collection = db.collection(owner);
  collection.findOne({id: "sessions"},function(error,result){
    assert.equal(error,null);
    if(result){
      var sessions = result.sessions;
      var news;
      var time;
      var newsData={};
      var values=[];
      var labels= [];
      var start,finish;
      for (index = 0 ; index < 6 ; index ++){
        start= index *4;
        finish= (index+1)*4;
        if(start <10 && finish <10 ){
          labels[index] = JSON.stringify("0"+start+":00"+"-0"+finish+":00");
        }
        else if( start < 10 & finish > 10 ){
          labels[index] = JSON.stringify("0"+start+":00"+"-"+finish+":00");
        }
        else{
          labels[index] = JSON.stringify(start+":00"+"-"+finish+":00");
          values[index]=0;
        }
      }
      var index,index2;
      for (index = 0 ; index < sessions.length ; index++ ){
        news = sessions[index].news;
        for ( index2 =0 ; index2 < news.length ; index2++ ){
          time = news[index2].time;
          time = time.split(":");
          time = time[0];
          values[Math.floor(time/4)]++;
        }
      }
      newsData.values=values;
      newsData.labels=labels;
      callback(newsData);
    }
    else{
      callback("no data");
    }
  });
}

var getTopicsData = function(db,owner,callback) {
  var collection = db.collection(owner);
  collection.findOne({id: "history"},function(error,result){
    assert.equal(error,null);
    if(result){
      var topicsData={};
      var domainScores = result.domainScores;
      if (domainScores){
        var index;
        var labels=[];
        var values=[];
        var properties = Object.keys(domainScores);
        for ( index = 0 ; index < properties.length ; index++ ){
          if(properties[index]!='noassignment'){
            labels.push(properties[index]);
            values.push(domainScores[properties[index]]);
          }
        }
        topicsData.labels=labels;
        topicsData.values=values;
        callback(topicsData);
      }
    }
  });
}

var getTopSites = function(db,owner,action,callback){
  var collection = db.collection(owner);
  collection.findOne({id: "history"},function(error,result){
    assert.equal(error,null);
    if(result){
      var history = result.history;
      if (history){
        var index;
        var topSites={};
        var labels=[];
        var values=[];
        history.sort(function(a, b) {return -(a.visitCount - b.visitCount)});
        index=0;
        while (labels.length < 10 && index< history.length){
          if(history[index].visitCount!=undefined && labels.indexOf(history[index].url)==-1){
            labels.push(history[index].url);
            values.push(history[index].visitCount);
          }
          index++;
        }
        topSites.labels=labels;
        if( action == "visits"){
          topSites.values=values;
        }
        else if (action=="avgtime"){
          for (index = 0 ; index <10 ; index++){
            values[index]=0;
            var counter=0;
            for (var index2=0 ; index2< history.length ; index2++){
              if(history[index2].url == labels[index]){
                if(history[index2].runningTime!=undefined){
                  values[index]+= history[index2].runningTime;
                  counter++;
                }
              }
            }
            if(counter!=0){
              values[index]=values[index]/counter;
            }
          }
          topSites.values=values;
        }
        callback(topSites);
      }
    }
  });
}


var findTimeReadingHabits = function(collection,callback){
  collection.findOne({id: "sessions"},function(error,result){

    assert.equal(error,null);
    if(result!=null){
      var topics = ["sport","music","science","politics","general","technology","entertainment","nature","business","gaming"];
      var sessions = [];
      var index,index2;
      var observedTable = new Array();
      var timeTotals=[0,0,0,0,0,0];
      var topicTotals=[0,0,0,0,0,0,0,0,0,0];
      var total=0;
      for (index = 0; index < 10 ; index++ ) {
        observedTable[index]=new Array();
        for ( index2 = 0 ; index2 < 6; index2++ ) {
          observedTable[index][index2]=0;
        }
      }
      sessions = result.sessions ;
      for (index = 0 ; index < sessions.length ; index++){
        var news = [];
        var newsObject= {};
        if(sessions[index].news!=undefined){
          news = sessions[index].news;
          for ( index2 = 0 ; index2 < news.length ; index2++ ){
            newsObject = news[index2];
            var timeIndex = newsObject.time;
            timeIndex = timeIndex.split(":");
            timeIndex = timeIndex[0];
            timeIndex = [Math.floor(timeIndex/4)];
            var topicIndex = newsObject.newsDomain;
            topicIndex = topicIndex.split('-');
            topicIndex = topicIndex[0];
            topicIndex = topics.indexOf(topicIndex);
            observedTable[topicIndex][timeIndex]++;
            total++;
            timeTotals[timeIndex]++;
            topicTotals[topicIndex]++;
          }
        }
      }
      if( total < 30 ){
        callback();
      }
      else{
        var chiSquare=0;
        for ( index = 0 ; index < 10 ; index++ ){
          for ( index2 = 0 ; index2 < 6 ; index2++ ){
            var expectedValue= (topicTotals[index]*timeTotals[index2])/total;
            if(expectedValue!=0){
              chiSquare+= Math.pow(observedTable[index][index2]-expectedValue,2)/expectedValue;
            }
          }
        }
        var p = chi.pdf(chiSquare,(10-1)*(6-1));
        if(p < 0.1){
          console.log("there is a relation between time and topic");
          var timeDomainHabits=[];
          var max=[0,0,0,0,0,0]
          for ( index = 0 ; index < 6 ; index++ ){
            for ( index2 = 0 ; index2 < 10 ; index2++ ){
              if (observedTable[index2][index]>max[index]){
                max[index]=observedTable[index2][index];
                timeDomainHabits[index]=topics[index2];
              }
            }
          }
          collection.updateOne({ id: "profile" }
          , { $set: { foundTimeReadingHabits : true , timeDomainHabits : timeDomainHabits }}, function(err, res) {
            assert.equal(err, null);
            callback();
          });
        }
        else{
          console.log("there is no relation between time and topic");
          callback();
        }
      }
    }
    else{
      callback();
    }
  });
}

var getNewsSources = function (db,owner,callback){
  var collection = db.collection(owner);
  sources=[];
  collection.findOne({id: "history"},function(error,result){
    assert.equal(error,null);
    if(result!=undefined){
      var questionnaire = result.questionnaire;
      if(questionnaire!=undefined){
        var answers=questionnaire.answers;
        for (index=2 ; index <12 ; index++){
          sources.push(answers[index]);
        }
        callback(sources);
      }
      else{
        callback(sources);
      }
    }
    else{
      callback(sources);
    }
  });
}


var deleteUser = function (db,owner,callback){
  db.dropCollection(owner, function(err, result) {
    assert.equal(err, null);
    callback("successfully deleted user: "+owner);
  });
}


module.exports={
  deleteUser : deleteUser,
  deleteSession: deleteSession,
  updateHistory: updateHistory,
  updateSession: updateSession,
  updateNews : updateNews,
  updateLikes : updateLikes,
  checkNewsReading : checkNewsReading,
  createProfile : createProfile,
  getDomainsOfInterest : getDomainsOfInterest,
  getSession : getSession,
  getFilledFlag : getFilledFlag,
  saveQuestionAnswer : saveQuestionAnswer,
  lastHistoryUpdate : lastHistoryUpdate,
  reEvaluation : reEvaluation,
  getSessionsData : getSessionsData,
  getTopicsData :getTopicsData,
  getTopSites :getTopSites,
  findTimeReadingHabits : findTimeReadingHabits,
  getNewsSources : getNewsSources,
};
