const fs = require('fs');
const request = require('request');

var validateSamples = function (samples){
    var endpoint = 'https://api.wit.ai/samples?v=20170307';
    var options = {
      uri: endpoint,
      method : 'POST',
      headers: {
        Authorization : 'Bearer VNYB6QY7QOB4JNMZQY7IVOGMTS5OZGGT',
        'Content-type': 'application/json'
      },
      body : JSON.stringify(samples),
    };
    request(options, function (err,res){
      if(err){
        console.log(err);
      }
      console.log(res.body);
    })

}

var trainBot = function ( filename , entityName ){
const data = fs
  .readFileSync(__dirname+'/'+filename, 'utf-8')
  .split('\r\n')
  .map(row => row.split(';'));
  data.splice(data.length-1,1);
  console.log(data)
  if (entityName == "intent"){
var samples = data.map(([text, value]) => {
  return {
    text,
    entities: [
      {
        entity: entityName,
        value,
      },
    ],
  };
});
}
else if (entityName== "entity"){
  var samples = data.map(([text, intentValue , entityValue , start , end ]) => {
    return {
        "text": text ,
        "entities": [
          {
            "entity": "intent",
            "value": intentValue
          },
          {
            "entity": entityValue ,
            "value": text.substring(start,end),
            "start": parseInt(start),
            "end": parseInt(end)
          }]
        };
  });
}
console.log(JSON.stringify(samples))
validateSamples(samples);
}

main =function (){
  var filename=process.argv[2];
  var entityName=process.argv[3];
  trainBot( filename , entityName );
}

main();
