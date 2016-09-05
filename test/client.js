var fs = require('fs');
var path = require('path');
var io = require('socket.io-client');
var iostream = require('socket.io-stream');

var client = io.connect('http://localhost:3000');

client.on('connect', function(){
  //权限验证
  client.emit('authentication', {key: '00001', token: '123456'});
  client.on('authenticated', function() {
    client.on('message', function(msg){
      console.log(msg);
    });
    client.emit('time', function(time){
      console.log(time);
    });
  });
  client.on('unauthorized', function (err) {
    console.log("There was an error with the authentication:", err.message);
  });
});

// var filename = 'student.xls';
// var stream = iostream.createStream();
// client.emit('upload', stream, { name:filename, type: 'others'});
// fs.createReadStream(path.resolve(__dirname,filename)).pipe(stream);
