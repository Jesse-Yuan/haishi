import express from 'express';
import {admin} from '../config';

const router = express.Router();

function authenticate(username,password) {
  return (admin.username==username && admin.password==password);
}

// 用户登录
router.post('/login', (req, res) => {
  let {username,password} = req.body.user;
  if(authenticate(username,password)){
    req.session.name = username;
    res.redirect('/home');
  }else{
    res.error('用户名或密码不正确');
    res.redirect('back');
  }
});

// 用户退出
router.get('/logout', (req, res) => {
  req.session.destroy(function (err) {
    if(err) throw err;
    res.redirect('/');
  })
});

export default router;
