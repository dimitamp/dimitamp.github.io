const request = require('request');

var endpoint = 'https://api.wit.ai/apps/5a0b4b35-0d46-4658-b96b-0af92e57b7e1?v=20170307';
var data = {
  timezone: "Europe/Athens",
};
var options = {
  uri: endpoint,
  method : 'PUT',
  headers: {
    Authorization : 'Bearer VNYB6QY7QOB4JNMZQY7IVOGMTS5OZGGT',
    'Content-type': 'application/json'
  },
  body :JSON.stringify(data),
};
request(options,function(err,res){
  if(err){
    console.log(err);
  }
  console.log(res.body);
})
