const request = require('request');


var sendMessage = function ( message ){
var endpoint = 'https://api.wit.ai/message?v=20170416'
var options = {
  uri : endpoint,
  method : 'GET',
  headers :{
    Authorization : 'Bearer VNYB6QY7QOB4JNMZQY7IVOGMTS5OZGGT'
  },
  qs : { q : message }
};

request (options, function(err , res){
  if (err ){
    console.log(err);
  }
  console.log(res.body)
})
}

main = function (){
  var message = process.argv[2];
  sendMessage(message);
}

main();
