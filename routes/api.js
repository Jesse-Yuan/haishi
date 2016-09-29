import express from 'express';
import multer from 'multer';
import MD5 from 'md5-file';

import oss from '../lib/AliossClient';
import Client from '../models/Client';
import File from '../models/File';

import {fileType} from '../config';
import Result,{SUCCESS,FAILUE} from '../lib/Result';

const router = express.Router();

//获取客户端列表
router.get('/clients', (req,res) => {
  Client.find((err,clients) => {
    if(err){
      res.json(new Result(FAILUE, `获取客户端列表失败:${err.message}`));
    }else{
      let countOfOnline = 0;
      clients.forEach(client=>{
        if(client.status=='online'){
          countOfOnline++;
        }
      });
      let message = `当前在线:${countOfOnline}`;
      res.json(new Result(SUCCESS, message, clients));
    }
  });
});

//获取某个客户端的信息
router.get('/client/:id', (req,res) => {
  Client.findById(req.params.id, (err,client) => {
    if(err){
      res.json(new Result(FAILUE, `获取客户端信息失败:${err.message}`));
    }else{
      res.json(new Result(SUCCESS, '获取客户端信息成功', client));
    }
  });
});

//新建客户端
router.post('/client/add', (req,res) => {
  let {key,token,description} = req.body.client;
  new Client({
    key,token,description
  }).save((err,client) => {
    if(err){
      res.json(new Result(FAILUE, `保存失败:${err.message}`));
    }else{
      res.json(new Result(SUCCESS, '保存成功', client));
    }
  });
});

//编辑客户端信息
router.post('/client/edit', (req,res) => {
  let {id,key,token,description} = req.body.client;
  Client.update({ _id: id },{
    $set: {key,token,description}
  }, err => {
    if (err) throw err;
    res.json(new Result(SUCCESS, '保存修改成功'));
  });
});

//删除客户端
router.delete('/clinet/:id', (req,res) => {
  Client.remove({ _id: req.params.id }, err => {
    if(err){
      res.json(new Result(FAILUE, '删除答题卡失败', err));
    }else{
      res.json(new Result(SUCCESS, '删除答题卡成功'));
    }
  });
});

//获取文件列表
router.get('/files', (req,res) => {
  ((type) => {
    switch (type){
      case fileType[0]:
      case fileType[1]:
      case fileType[2]:
      case fileType[3]:
        return File.find({type:req.params.type});
      default:
        return File.find();
    }
  })(req.query.type).then(files => {
    res.json(new Result(SUCCESS, '获取文件列表成功', files));
  }).catch(err => {
    res.json(new Result(FAILUE, `获取文件列表失败:${err.message}`));
  });
});

//指定上传文件的临时目录
var upload = multer({dest:'temp/'});
//文件上传
router.post('/file/upload', upload.single('uploadFile'), (req,res) => {
  const uploadFile = req.file;
  const name = uploadFile.originalname;
  const type = req.body.fileType;
  const key = `${type}/${name}`;
  const md5 = MD5.sync(uploadFile.path).toUpperCase();

  Promise.all([
    File.findOne({key}).then(file => {
      if(file){
        if(file.md5==md5) throw new Error('文件已存在');
        return File.update({key}, {
          $set: {
            md5,
            version: file.version +1,
            uploadTime: new Date()
          }
        });
      }else{
        return new File({name, type, key, md5}).save();
      }
    }),
    oss.put(key, uploadFile.path)
  ]).then(() => {
    res.json(new Result(SUCCESS, '文件上传成功'));
  }).catch(err=>{
    res.json(new Result(FAILUE, `文件上传失败:${err.message}`));
  });
});

// 文件下载
router.get('/file/download', (req, res) => {
  File.findById(req.query.id).then(file => {
    return oss.signatureUrl(file.key);
  }).then(url => {
    res.redirect(url);
  }).catch(err => {
    res.end(`文件上传失败:${err.message}`);
  });
});

//获取某个文件的信息
router.get('/file/:id', (req,res) => {

});

// 删除文件
router.delete('/file/:id', (req,res) => {
  Promise.all([
    File.findById(req.params.id).then(file => {
      if(file) return oss.delete(file.key);
      throw new Error('文件不存在');
    }),
    File.remove({ _id: req.params.id })
  ]).then(()=>{
    res.json(new Result(SUCCESS, '文件删除成功'));
  }).catch(err=>{
    res.json(new Result(FAILUE, `文件删除失败:${err.message}`));
  });
});

export default router;
