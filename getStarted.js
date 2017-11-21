var request = require('request');
var Config = require('./const.js');

var createButtons = function(){
  var url =  "https://graph.facebook.com/v2.6/me/thread_settings?access_token="+Config.FB_PAGE_TOKEN;
  var helpPayload=JSON.stringify({'id' : 'GET_HELP_PAYLOAD'});
  var resetPayload=JSON.stringify({'id' : 'RESET_PAYLOAD'});
  var data={ "setting_type" : "call_to_actions",
  "thread_state" : "existing_thread",
  "call_to_actions": [{
      "type":"postback",
      "title": "Help",
      "payload":  helpPayload,
    },
    {
        "type":"postback",
        "title": "Reset",
        "payload": resetPayload,
      },
  ]
  };


data = JSON.stringify(data);
request.post({
  headers: {'content-type' : 'application/json'},
  url:     url,
  body:    data
}, function(error, response, body){
  console.log(body);
});
}

var deleteButton = function(){
  var url =  "https://graph.facebook.com/v2.6/me/thread_settings?access_token="+Config.FB_PAGE_TOKEN;
  var data={ "setting_type" : "call_to_actions",
  "thread_state" : "existing_thread"}

  data = JSON.stringify(data);
  request.delete({
    headers: {'content-type' : 'application/json'},
    url:     url,
    body:    data
  }, function(error, response, body){
    console.log(body);
  });
}

var createGetStartedButton = function(){
  var url="https://graph.facebook.com/v2.6/me/messenger_profile?access_token="+Config.FB_PAGE_TOKEN;
  var payload=JSON.stringify({'id' : 'GET_STARTED_PAYLOAD'});
  var data= {
    "get_started":{
      "payload": payload,
    }
  };
  data=JSON.stringify(data);
  request.post({
    headers: {'content-type' : 'application/json'},
    url:     url,
    body:    data
  }, function(error, response, body){
    console.log(body);
  });
}

var deleteGetStartedButton = function (){
  var url="https://graph.facebook.com/v2.6/me/messenger_profile?access_token="+Config.FB_PAGE_TOKEN;
  var data= {
    "fields":["get_started"]
  };
  data=JSON.stringify(data);
  request.delete({
    headers: {'content-type' : 'application/json'},
    url:     url,
    body:    data
  }, function(error, response, body){
    console.log(body);
  });
}

var whitelistUrl= function(action,url){
  var uri="https://graph.facebook.com/v2.6/me/thread_settings?access_token="+Config.FB_PAGE_TOKEN;
  var dat={
    "setting_type" : "domain_whitelisting",
    "whitelisted_domains" : [url],
    "domain_action_type": action,
  };
  dat=JSON.stringify(dat);
  request.post({
    headers: {'content-type' : 'application/json'},
    url:     uri,
    body:    dat
  }, function(error, response, body){
    console.log(body);
  });
}

main =function (){
  var func=process.argv[2];
  var option1=process.argv[3];
  var option2=process.argv[4];
  switch(func){
    case "createGetStartedButton":
    createGetStartedButton();
    break;
    case "deleteGetStartedButton":
    deleteGetStartedButton();
    break;
    case "whitelistUrl":
    whitelistUrl(option1,option2);
    case "createButtons" :
    createButtons();
    break;
    case "deleteButton":
    deleteButton();
    break;
  }
}

main();
