'use strict';

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference
const request = require('request');
const Config = require('./const.js');

var fbMessage =function (recipientId,msg,cb){
  var url="https://graph.facebook.com/me/messages?access_token="+Config.FB_PAGE_TOKEN;
  var reqData;

  if(typeof(msg)=="string"){
    reqData={
      "recipient": {
        "id": recipientId
      }, "message": {
        "text" :msg,
      },
    };
  }
  else{
    reqData={
      "recipient": {
        "id": recipientId
      }, "message": msg,
    };
  }
  reqData=JSON.stringify(reqData);
  request.post({
    headers: {'content-type' : 'application/json'},
    url:     url,
    body:    reqData
  }, function(err, response, data){
    if (cb) {
      cb(err || data.error && data.error.message, data);
    }
  });


}

// See the Webhook reference
// https://developers.facebook.com/docs/messenger-platform/webhook-reference
const getFirstMessagingEntry = (body) => {
  const val = body.object === 'page' &&
  body.entry &&
  Array.isArray(body.entry) &&
  body.entry.length > 0 &&
  body.entry[0] &&
  body.entry[0].messaging &&
  Array.isArray(body.entry[0].messaging) &&
  body.entry[0].messaging.length > 0 &&
  body.entry[0].messaging[0];

  return val || null;
};



module.exports = {
  getFirstMessagingEntry: getFirstMessagingEntry,
  fbMessage: fbMessage,
};
