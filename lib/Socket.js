import socket from 'socket.io';
import auth from 'socketio-auth';
import iostream from 'socket.io-stream';
import oss from './AliossClient';
import Client from '../models/Client';
import File from '../models/File';

function Socket(server) {

  // 启动Socket.IO服务器,运行它搭载在已有的HTTP服务器上
  const io = socket(server);

  // 30秒发送一次心跳检测,默认超时时间为60秒
  io.set('heartbeat interval', 30000);
  // io.set('heartbeat timeout', 60000);

  //重置所有客户端状态
  Client.update({status:'online'}, {
    $set: {status:'offline'}
  }).then(() =>{
    // 权限校验
    auth(io,{
      authenticate: (socket, data, callback) => {
        let {key,token} = data;
        Client.findOne({key,token}).then(client => {
          if(client){
            if(client.status=='online')
              return callback(new Error("Client has connected"));
            return callback(null, true);
          } else {
            return callback(new Error("Unauthorized"));
          }
        }).catch(err => {
          if(err) return callback(new Error("Unauthorized"));
        });
      },
      postAuthenticate: (socket, data) => {
        Client.findOne({key: data.key}).then(client => {
          socket.client._id = client._id;
          Client.update({_id:client._id}, {
            $set: {status:'online'}
          }).then(() => {
            socket.emit('message', `Client ${client._id} has successfully connected`);
          }).catch(err => {
            if (err) console.error(err);
          });
        });

        // 获取系统时间
        socket.on('time', next => {
          next(new Date());
        });

        // 文件上传
        iostream(socket).on('upload', (stream,data) => {
          let {name,type} = data;
          let key = `${type}/${name}`;
          Promise.all([
            oss.putStream(key, stream),
            File.findOne({key}).then(file => {
              if(file){
                return File.update({key},{$set: {createTime:new Date()}});
              }else{
                return new File({name, type, key}).save();
              }
            })
          ]).then(() => {
            socket.emit('message', `文件${name}上传成功`);
          }).catch(err => {
            if (err) console.error(err);
          });
        });

        // 文件下载
        iostream(socket).on('download', (outputStream, data) => {
          let {name,type} = data;
          oss.getStream(`${type}/${name}`).then(stream => {
            stream.pipe(outputStream);
          }).catch(err => {
            if (err) console.error(err);
            socket.emit('message', err.message);
          });
        });

        // 用户断开连接
        socket.on('disconnect', () => {
          Client.update({_id:socket.client._id}, {
            $set: {status:'offline'}
          }).then(result => {
            console.log(result);
          }).catch(err => {
            if (err) console.error(err);
          });
        });
      },
      timeout: 1000
    });
  });
}

module.exports = Socket;
