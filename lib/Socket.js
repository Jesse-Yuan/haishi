import log4js from 'log4js';
import socket from 'socket.io';
import monitor from 'monitor.io';
import auth from 'socketio-auth';
import iostream from 'socket.io-stream';
import Promise from 'bluebird';

import oss from './AliossClient';
import Client from '../models/Client';
import File from '../models/File';
import Log, {EVENT} from '../models/Log';

import Message,{SUCCESS,FAILUE} from '../lib/Message';

const log = log4js.getLogger("console") ;

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
              return callback(new Error("客户端已连接"));
            return callback(null, true);
          } else {
            return callback(new Error("验证失败"));
          }
        }).catch(err => {
          log.error(err.message);
          return callback(new Error("验证失败"));
        });
      },
      postAuthenticate: (socket, data) => {
        let message = {};
        Client.findOne({key: data.key}).then(client => {
          socket.client._id = client._id;
          return Client.update({_id: client._id}, {
            $set: {status: 'online'}
          });
        }).then(() => {
          message = new Message(SUCCESS, EVENT.connect, `客户端连接成功`);
          return new Log({
            client: socket.client._id,
            event: EVENT.connect,
            description: message.msg
          }).save();
        }).catch(err => {
          log.error(err);
          message = new Message(FAILUE, EVENT.connect, `客户端连接失败: ${err.message}`);
        }).finally(() => {
          socket.emit('message', JSON.stringify(message));
        });

        // 获取系统时间
        socket.on('time', next => {
          next(new Date());
        });

        // 获取客户端更新文件信息
        socket.on('getUpdateFile', next => {
          Client.findById(socket.client._id)
            .populate('updateFile')
            .then(client => {
              if(client){
                message = new Message(SUCCESS, EVENT.getUpdateFile, '获取客户端更新文件成功', client.updateFile);
              }else{
                message = new Message(FAILUE, EVENT.getUpdateFile, '没有可用的更新文件');
              }
            }).catch(err => {
              message = new Message(FAILUE, EVENT.getUpdateFile, `获取客户端更新文件失败: ${err.message}`);
            }).finally(() => {
              next(JSON.stringify(message));
              return new Log({
                client: socket.client._id,
                event: EVENT.getUpdateFile,
                description: message.msg
              }).save();
            });
        });

        // 客户端更新完成后通知后台
        socket.on('updateClient', message => {
          return new Log({
            client: socket.client._id,
            event: EVENT.update,
            description: message || '客户端更新成功'
          }).save();
        });

        // 文件上传
        iostream(socket).on('upload', (stream, {name, type, md5}) => {
          if( !name || !type || !md5){
            message = new Message(FAILUE, EVENT.upload, `文件上传失败：参数不正确`);
            socket.emit('message', JSON.stringify(message));
            return new Log({
              client: socket.client._id,
              event: EVENT.upload,
              description: message.msg
            }).save();
            return;
          }
          const key = `${type}/${name}`;
          md5 = md5.toUpperCase();
          let message = {};
          File.findOne({key}).then(file => {
            if (file) {
              if (file.md5 == md5) throw new Error('文件已存在');
              return File.update({key}, {
                $set: {
                  md5,
                  version: file.version + 1,
                  uploadTime: new Date()
                }
              });
            } else {
              return new File({name, type, key, md5}).save();
            }
          }).then(() => {
            return oss.putStream(key, stream);
          }).then((result) => {
            log.debug(result);
            let {etag} = result.res.headers;
            if (etag.replace(/"/g, '') == md5) throw new Error('文件MD5校验失败');
            message = new Message(SUCCESS, EVENT.upload, `文件${name}上传成功`, {md5});
          }).catch((err)=> {
            log.error(err);
            message = new Message(FAILUE, EVENT.upload, `文件${name}上传失败：${err.message}`, {md5});
          }).finally(()=> {
            socket.emit('message', JSON.stringify(message));
            return new Log({
              client: socket.client._id,
              event: EVENT.upload,
              description: message.msg
            }).save();
          });
        });

        // 文件下载
        iostream(socket).on('download', (outputStream, {name, type, md5}) => {
          if( !name || !type || !md5){
            message = new Message(FAILUE, EVENT.upload, `文件下载失败：参数不正确`);
            socket.emit('message', JSON.stringify(message));
            return new Log({
              client: socket.client._id,
              event: EVENT.download,
              description: message.msg
            }).save();
            return;
          }

          const key = `${type}/${name}`;
          md5 = md5.toUpperCase();
          let message = {};
          Promise.resolve(oss.getStream(key)).then(response => {
            response.stream.pipe(outputStream);
            message = new Message(SUCCESS, EVENT.download, `文件${name}下载成功`, {md5});
          }).catch(err => {
            log.error(err);
            message = new Message(FAILUE, EVENT.download, `文件${name}上传失败：${err.message}`, {md5});
          }).finally(()=>{
            socket.emit('message', JSON.stringify(message));
            return new Log({
              client: socket.client._id,
              event: EVENT.download,
              description: message.msg
            }).save();
          });
        });

        // 用户断开连接
        socket.on('disconnect', () => {
          message = new Message(SUCCESS, EVENT.disconnect, `客户端已断开`);
          Client.update({_id:socket.client._id}, {
            $set: {status:'offline'}
          }).then(result => {
            log.info(result);
          }).catch(err => {
            log.error(err);
          }).finally(()=>{
            socket.emit('message', JSON.stringify(message));
            return new Log({
              client: socket.client._id,
              event: EVENT.disconnect,
              description: message.msg
            }).save();
          });
        });
      },
      timeout: 1000
    });
  });
}

module.exports = Socket;
