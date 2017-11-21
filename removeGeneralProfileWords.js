const fs = require('fs');
var removeGeneral = function ( path , domain){

  var files = fs.readdirSync(__dirname + path);
  files.splice(files.indexOf(domain+'.twords'),1);
  fs.readFile( __dirname+path+domain+'.twords','utf8',function(error,generalData){

    if (error) {
      return console.log(error);
    }
    var lines = generalData.match(/[^\r\n]+/g);
    var index;
    var indexOf;
    var generalProfileVector=[];
    var profileVector;
    for ( index = 0 ; index < lines.length ; index++ ){
      generalProfileVector[index] = lines[index].split(' ')[0];
    }
    files.forEach(function(file){
      fs.readFile( __dirname+path+file,'utf8',function(err,data){
        if (err) {
          return console.log(err);
        }
        lines = data.match(/[^\r\n]+/g);
        profileVector=[];
        for ( index = 0 ; index < lines.length ; index++ ){
          profileVector[index] = lines[index].split(' ')[0];
        }
        for ( index = 0 ; index < generalProfileVector.length ; index++ ){
          indexOf=profileVector.indexOf(generalProfileVector[index]);
          if(indexOf!=-1){
            profileVector.splice(indexOf,1);
          }
        }
        file = file.split('.');
        file = file[0];
        fs.writeFile(__dirname+path+file+'.txt', profileVector, function (err) {
          if (err) return console.log(err);
        });
      });
    });
  });
}
main =function (){
  var path=process.argv[2];
  var domain=process.argv[3];
  removeGeneral(path,domain);
}

main();
