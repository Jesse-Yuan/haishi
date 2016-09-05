import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', {title: '首页'});
});

router.get('/home', (req, res) => {
  res.render('home', {title: '后台管理系统'});
});

router.get('/clients', (req, res) => {
  res.render('clients', {title: '客户端管理'});
});

router.get('/files', (req, res) => {
  res.render('files', {title: '文件管理'});
});

export default router;
