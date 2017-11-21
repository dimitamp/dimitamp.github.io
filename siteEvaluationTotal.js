
const stopwords = require('node-stopwords-filter');
const request = require('superagent');
const req= require('req-fast');
const uri = require('url');
const sanitizeHtml = require('sanitize-html');
const natural = require('natural');
const Promise = require('promise');
const fs = require('fs');
const topicWords = require('./topicWords.js');
var siteEval = function(url){
  //threshold to accept or reject an assignement. due to only two domains relevance Scores are extremely low in most cases
  var threshold=0.2;
  return new Promise(function(resolve,reject){
    // request the body of the url
    var i,l,temp={},profile,max=0,assignedProfile;
    req(url, function(error, response) {
      if(response!=undefined){
        if(response.body){
          var entities = [];
          //remove html symbols and code
          //var selectedHtml=htmlSelector(response.body);
          var sanitized = sanitizeHtml(response.body,{
            allowedTags: [ ],
            allowedAttributes: [],
          });
          var siteWordVec = siteWordVector(sanitized);
          if(siteWordVec.length<100){
            return resolve({ "assignedProfile":'noassignment', "assignmentScore" : 0});
          }
          var spotlight_config= { host: 'model.dbpedia-spotlight.org', path: '/en/annotate', port: '80', confidence: 0.40  , support: 20 };
          var endpoint = uri.format({
            protocol: spotlight_config.protocol || 'http:',
            slashes: '//',
            auth:     spotlight_config.auth,
            hostname: spotlight_config.host,
            port:     spotlight_config.port,
            pathname: spotlight_config.path ,
          });
          request.post(endpoint)
          .accept('application/json')
          .set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8')
          .send({
            'text':       sanitized ,
            'confidence': spotlight_config.confidence,
            'support':    spotlight_config.support
          })
          .end(function(err, res) {
            debugger;
            if(err){
              return resolve({"assignedProfile": 'noassignment', "assignmentScore":0});
            }
            var categories = [];

            if(res!=undefined){
              var resources = res.body;
              var object= {};
              var string='';
              resources = resources.Resources;
              var index ;
              if(resources!=undefined){
                for (index = 0 ; index < resources.length ; index++){
                  object = resources[index];
                  entities.push({ "entity" : object['@surfaceForm'].toLowerCase(), "support" : object['@support'], "similarityScore" : object['@similarityScore'] , "percentageOfSecondRank" : object['@percentageOfSecondRank']});
                }
              }
            }
            profileRelevanceScore(siteWordVec,topicWords.topics,entities,function(totalScores){

              //console.log(totalScores);
              for( i = 0 ; i < totalScores.length ; i++){
                temp = totalScores[i];
                profile=Object.keys(temp);
                profile=profile[0];
                if( temp[profile] >max ){
                  max=temp[profile];
                  assignedProfile=profile;
                }
              }
              if(max<threshold){
                assignedProfile='noassignment';
              }
              return resolve({"assignedProfile" :assignedProfile, "assignmentScore" : max});
            });
          });
        }
        else{
          return resolve({ "assignedProfile":'noassignment', "assignmentScore" : 0});
        }
      }
      else{
        return resolve({ "assignedProfile":'noassignment', "assignmentScore" : 0});
      }
    });
  });
}


var siteWordVector = function(sanitized){

  //remove stopwords
  var f = new stopwords();
  var nostopwords = f.filter(sanitized,'string');
  //remove numbers and use lemmatization
  var nonumbers= nostopwords.replace(/[0-9]/g, '');
  var stemmer = natural.PorterStemmer;
  stemmer.attach();
  var stemmed = nonumbers.stem();
  stemmed = stemmed.toLowerCase();
  stemmed= stemmed.split(' ');
  stemmed=stemmed.filter(String);
  return stemmed;
}





var profileRelevanceScore = function (siteWordVec,profileVectors,entities,callback){
  var index2,index;
  var relevanceScore,semanticScore,confidenceScore;
  var avgSimilarity,avgSupport,secondRankPercentage,minSupport=1000000,maxSupport=-1;
  var profileWordVec=[];
  var totalScores=[];
  var totalScore={};
  var profile='';
  maxSupport=Math.max.apply(Math,entities.map(function(object){return object.support;}))
  minSupport=Math.min.apply(Math,entities.map(function(object){return object.support;}))
  for (index2=0 ; index2< profileVectors.length ; index2++){
    profileWordVec= profileVectors[index2].twords;
    profile= profileVectors[index2].topic;
    profile= profile.split('.');
    profile= profile[0];
    relevanceScore=0;
    confidenceScore=0;
    secondRankPercentage=0;
    avgSimilarity=0;
    avgSupport=0;
    semanticScore=0;
    var cons= {};
    for ( index = 0 ; index < profileWordVec.length ; index++ ){
      if( siteWordVec.indexOf(profileWordVec[index])!=-1){
        relevanceScore++;
      }
    }
    for ( index = 0 ; index < entities.length ; index++ ){
      if( profileWordVec.indexOf(entities[index].entity)!=-1){
        semanticScore++;
        avgSimilarity += parseFloat(entities[index].similarityScore);
        avgSupport += parseInt(entities[index].support);
        if (parseFloat(entities[index].percentageOfSecondRank)==0){
          secondRankPercentage++;
        }
      }
    }
    if(semanticScore>0){

      avgSupport = avgSupport / semanticScore;
      avgSupport = (avgSupport - minSupport)/(maxSupport-minSupport);
      avgSimilarity = avgSimilarity / semanticScore;
      secondRankPercentage = secondRankPercentage / semanticScore ;
    }
    confidenceScore = ( avgSimilarity + avgSupport + secondRankPercentage) / 3   ;
    relevanceScore = relevanceScore / profileWordVec.length;
    if(entities.length>0){
    semanticScore = semanticScore / entities.length;
    }
    totalScore={};
    totalScore[profile] =  0.6 * relevanceScore + 0.3 * semanticScore + 0.1 * confidenceScore;
    cons.profile = profile;
    cons.secondRankPercentage = secondRankPercentage ;
    cons.avgSimilarity = avgSimilarity;
    cons.avgSupport = avgSupport ;
    cons.relevanceScore = relevanceScore;
    cons.semanticScore= semanticScore;
    cons.totalScore = totalScore[profile];
    //console.log(cons)
    totalScores.push(totalScore);
  }

  callback(totalScores);
}

var htmlSelector = function(html){
  var paragraphs="";
  var flag1=true;
  var flag2=true;
  var index1,index2;
  var body = html;
  while (flag1 && flag2){
    index1= body.match('<p>');
    if(index1!=null){
      index1= index1['index'];
    }
    index2= body.match('</p>');
    if(index2!=null){
      index2= index2['index'];
    }
    if (index1 && index2){
      paragraphs = paragraphs + body.substring(index1,index2+4);
      flag1=true;
      flag2=true
      body= body.replace("<p>", "<>");
      body= body.replace("</p>","<>");
    }
    else{
      flag1=false;
      flag2=false;
    }
  }
  return paragraphs;
}

module.exports={
  siteEval : siteEval,
};
