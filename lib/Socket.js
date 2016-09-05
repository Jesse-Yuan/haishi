import 'babel-polyfill';

import socket from 'socket.io';
import iostream from 'socket.io-stream';

import config from '../config';
import File from '../models/File';

import oss from './AliossClient';
import { addClient, delClient} from './Redis';


function Socket(server) {

  // 启动Socket.IO服务器,运行它搭载在已有的HTTP服务器上
  const io = socket(server);

  // 30秒发送一次心跳检测,默认超时时间为60秒
  io.set('heartbeat interval', 30000);
  // io.set('heartbeat timeout', 60000);

  // 权限校验中间件
  // io.use(function(socket, next){
  //   if (socket.request.headers.cookie) return next();
  //   next(new Error('Authentication error'));
  // });

  // 定义每个用户连接的处理逻辑
  io.on('connection', socket => {

    addClient(socket.id,  err =>  {
      if (err) throw err;
      socket.emit('message', 'Client has successfully connected');
    });

    // 获取系统时间
    socket.on('time', next => {
      next(new Date());
    });

    // 上传文件
    iostream(socket).on('upload', (stream, data) => {
      let { name,type } = data;
      let key = `${config.fileType[type]}/${name}`;
      oss.putStream(key, stream).then(result=>{
        console.log(result);
        new File({ name, type, key }).save((err)=>{
          if (err) throw err;
        });
      }).catch(err=>{
        if (err) throw err;
      });
    });

    // 下载文件
    // iostream(socket).on('download', data => {
    //   let { name, type } = data;
    //   let key = `${config.fileType[type]}/${name}`;
    //   oss.getStream(key).then(result=>{
    //     let stream = iostream.createStream();
    //     socket.emit('file',stream);
    //     stream.pipe(result.stream);
    //   }).catch(err=>{
    //     if (err) throw err;
    //   });
    // });

    // 用户断开连接
    socket.on('disconnect', () => {
      delClient(socket.id, err => {
        if (err) throw err;
      });
    });
  });
}

module.exports = Socket;
