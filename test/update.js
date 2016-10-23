var fs = require('fs');
var path = require('path');
var io = require('socket.io-client');
var iostream = require('socket.io-stream');

var client = io.connect('http://localhost:3000');
var downloadPath = path.resolve(__dirname,'./downloads');

//文件下载
client.download = function (filePath, fileName, fileType, md5) {
  var stream = iostream.createStream();
  iostream(this).emit('download', stream, { name: fileName, type: fileType, md5: md5});
  stream.pipe(fs.createWriteStream(path.join(filePath,fileName)));
};

client.on('connect', function(){
  //权限验证
  client.emit('authentication', {key: '00001', token: '123456'});

  //验证成功
  client.on('authenticated', function() {

    //监听系统消息
    client.on('message', function(result){
      result = JSON.parse(result);
      console.log(result.event + ':' + result.msg);
    });

    //获取客户端更新信息
    client.emit('getUpdateFile', function (result) {
      result = JSON.parse(result);
      if(result.code === 1){
        console.log(result.msg);
        const file = result.data;

        // 校验文件MD5信息，确认是否要下载更新文件
        if(file.md5 != '本地文件MD5'){
          // 下载文件
          client.download(downloadPath, result.data.name, 'dists', file.md5);

          // 更新客户端后，通知服务器
          client.emit('updateClient', '客户端更新成功');
        }
      } else {
        // 记录错误日志
        console.error(result.msg);
      }
    });

  });

  //验证失败
  client.on('unauthorized', function (err) {
    console.log("There was an error with the authentication:", err.message);
  });
});
