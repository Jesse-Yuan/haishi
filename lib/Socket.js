import socket from 'socket.io';
import monitor from 'monitor.io';
import auth from 'socketio-auth';
import iostream from 'socket.io-stream';
import crypto from 'crypto';
import Promise from 'bluebird';

import oss from './AliossClient';
import Client from '../models/Client';
import File from '../models/File';
import Log, {EVENT} from '../models/Log';

function Socket(server) {

  // 启动Socket.IO服务器,运行它搭载在已有的HTTP服务器上
  const io = socket(server);

  // 30秒发送一次心跳检测,默认超时时间为60秒
  io.set('heartbeat interval', 30000);
  // io.set('heartbeat timeout', 60000);

  // 远程监控和调试中间件
  io.use(monitor({port:8000}));

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
          let message = '';
          return Client.update({_id:client._id}, {
            $set: {status:'online'}
          }).then(() => {
            message = `Client has successfully connected`;
            socket.emit('message', message);
          }).catch(err => {
            if (err) console.error(err);
            message = `Client connect failed: ${err.message}`;
          }).finally(()=>{
            return new Log({
              client: client._id,
              event: EVENT.connect,
              description: message
            }).save();
          });
        });

        // 获取系统时间
        socket.on('time', next => {
          next(new Date());
        });

        // 文件上传
        iostream(socket).on('upload', (stream,data) => {
          const {name,type} = data;
          const key = `${type}/${name}`;

          let md5 = Promise.promisify(
            function (input,callback) {
              let output = crypto.createHash('md5');
              input.pipe(output);
              input.on('error', err => {callback(err)});
              output.once('readable', () => {
                callback(null, output.read().toString('hex'));
              });
            }
          );

          let message = '';
          Promise.all([
            md5(stream),
            File.findOne({key})
          ]).then(([hash,file])=>{
            if (file) {
              if (file.md5 == hash) throw new Error('文件已存在');
              return File.update({key}, {
                $set: {
                  md5:hash,
                  version: file.version + 1,
                  uploadTime: new Date()
                }
              });
            } else {
              return new File({name, type, key, md5:hash}).save();
            }
          }).then(()=>{
            return oss.putStream(key, stream);
          }).then(() => {
            message = `文件${name}上传成功`;
            socket.emit('message', message);
          }).catch(err => {
            if (err) console.error(err);
            message = `文件${name}上传失败：${err.message}`;
            socket.emit('message', message);
          }).finally(()=>{
            return new Log({
              client: socket.client._id,
              event: EVENT.upload,
              description: message
            }).save();
          });
        });

        // 文件下载
        iostream(socket).on('download', (outputStream, data) => {
          let {name,type} = data;
          let message = '';
          oss.getStream(`${type}/${name}`).then(stream => {
            message = `文件${name}下载成功`;
            stream.pipe(outputStream);
          }).catch(err => {
            if (err) console.error(err);
            message = `文件${name}上传失败：${err.message}`;
            socket.emit('message', message);
          }).finally(()=>{
            return new Log({
              client: socket.client._id,
              event: EVENT.download,
              description: message
            }).save();
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
          }).finally(()=>{
            return new Log({
              client: socket.client._id,
              event: EVENT.disconnect,
              description: `client has disconnected`
            }).save();
          });
        });
      },
      timeout: 1000
    });
  });
}

module.exports = Socket;
