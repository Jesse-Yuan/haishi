import express from 'express';
import Client from '../models/Client';

import Result,{SUCCESS,FAILUE} from '../lib/Result';

const router = express.Router();

//获取客户端列表
router.get('/clients', (req,res) => {
  Client.find((err,clients) => {
    if(err){
      res.json(new Result(FAILUE, '获取客户端列表失败', err));
    }else{
      let countOfOnline = 0;
      clients.forEach(client=>{
        if(client.status=='online'){
          countOfOnline++;
        }
      });
      let message = `当前在线:${countOfOnline}`;
      res.json(new Result(SUCCESS, message, null, clients));
    }
  });
});

//获取某个客户端的信息
router.get('/client/:id', (req,res) => {
  Client.findById(req.params.id, (err,client) => {
    if(err){
      res.json(new Result(FAILUE, '获取客户端信息失败', err));
    }else{
      res.json(new Result(SUCCESS, '获取客户端信息成功', null, client));
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
      res.json(new Result(FAILUE, '保存失败', err));
    }else{
      res.json(new Result(SUCCESS, '保存成功', null, client));
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

});

//获取某个文件的信息
router.get('/file/:id', (req,res) => {

});

//新建客户端
router.post('/file/upload', (req,res) => {

});

router.delete('/file/:id', (req,res) => {

});

export default router;
