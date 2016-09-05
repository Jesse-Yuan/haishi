import socket from 'socket.io';
import auth from 'socketio-auth';
import Client from '../models/Client';

function Socket(server) {

  // 启动Socket.IO服务器,运行它搭载在已有的HTTP服务器上
  const io = socket(server);

  // 30秒发送一次心跳检测,默认超时时间为60秒
  io.set('heartbeat interval', 30000);
  // io.set('heartbeat timeout', 60000);

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
          if (err) throw err;
        });
      });

      // 获取系统时间
      socket.on('time', next => {
        next(new Date());
      });

      // 用户断开连接
      socket.on('disconnect', () => {
        Client.update({_id:socket.client._id}, {
          $set: {status:'offline'}
        }).catch(err => {
          if (err) throw err;
        });
      });
    },
    timeout: 1000
  });
}

module.exports = Socket;
