var fs = require('fs');
var path = require('path');
var io = require('socket.io-client');
var iostream = require('socket.io-stream');

var client = io.connect('http://localhost:3000');

client.on('message', function(msg){
  console.log(msg);
});

client.emit('time', function(time){
  console.log(time);
});

var filename = 'student.xls';
var stream = iostream.createStream();
client.emit('upload', stream, { name:filename, type: 'others'});
fs.createReadStream(path.resolve(__dirname,filename)).pipe(stream);
