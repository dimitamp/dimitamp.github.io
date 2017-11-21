var Text = require('./text.js')
var FB = require('./facebook.js');
var createRepliesList= function (replies,questionNumber){
  var repliesList=[];
  var index;
  var length=replies.length;
  var reply={};
  var payload;
  for (index=0 ; index < length ; index++){
    payload=JSON.stringify({'id' : 'QUESTIONNAIRE_ANSWER_PAYLOAD','questionNumber': questionNumber,'questionAnswer':replies[index]});
    reply= {
      "content_type":"text",
      "title":replies[index],
      "payload":payload
    }
    repliesList.push(reply);
  }
  return repliesList;
}


var  questionnaire = function (recipientId,questionNumber){
    var replies=[];
    var question;
    var questionnaire={};
    question=Text.questions[questionNumber];
    replies=Text.questionReplies[questionNumber];
    replies= createRepliesList(replies,questionNumber);
    questionnaire={
      "text": question,
      "quick_replies": replies,
    };
    FB.fbMessage(
      recipientId,questionnaire, (err, data) => {
        if (err) {
          console.log(
            'Oops! An error occurred while forwarding the response to',
            recipientId,
            ':',
            err
          );
        }
      });
    return;
    }





module.exports = {
  questionnaire : questionnaire,
};
