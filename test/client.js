var fs = require('fs');
var path = require('path');
var MD5 = require('md5-file');
var io = require('socket.io-client');
var iostream = require('socket.io-stream');

var client = io.connect('http://localhost:3000');
var uploadPath = path.resolve(__dirname,'./uploads');
var downloadPath = path.resolve(__dirname,'./downloads');

//文件上传
client.upload = function (filePath, fileName, fileType) {
  var md5 = MD5.sync(path.join(filePath,fileName));
  var stream = iostream.createStream();
  iostream(this).emit('upload', stream, { name: fileName, type: fileType, md5: md5});
  fs.createReadStream(path.join(filePath,fileName)).pipe(stream);
};

//文件下载
client.download = function (filePath, fileName, fileType) {
  var stream = iostream.createStream();
  iostream(this).emit('download', stream, { name: fileName, type: fileType});
  stream.pipe(fs.createWriteStream(path.join(filePath,fileName)));
};

client.on('connect', function(){
  //权限验证
  client.emit('authentication', {key: '00001', token: '123456'});

  //验证成功
  client.on('authenticated', function() {
    //获取系统时间
    client.emit('time', function(time){
      console.log(time);
    });

    //监听系统消息
    client.on('message', function(msg){
      console.log(msg);
    });

    //上传文件
    //client.upload(uploadPath, 'student.xls', 'others');

    //下载文件
    //client.download(downloadPath, 'student.xls', 'others');

  });

  //验证失败
  client.on('unauthorized', function (err) {
    console.log("There was an error with the authentication:", err.message);
  });
});
