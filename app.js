import express from 'express';
import mongoose from 'mongoose';

import path from 'path';
// import logger from 'morgan';

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';

import config from './config';
import user from './routes/user';
import api from './routes/api';
import page from './routes/page';
import Result, {} from './lib/Result';
import message from './lib/middleware/message';

var app = express();

mongoose.connect(config.mongo.server, config.mongo.dbname);
mongoose.connection.on('error', () => {
  console.error('Error: Could not connect to MongoDB.');
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'keyboard cat',
  cookie: { maxAge: 30 * 60 * 1000 },
  resave: false,
  saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(message);

//登录拦截
var ignore_urls = [];
ignore_urls.push('/');
ignore_urls.push('/user/login');
ignore_urls.push('/user/logout');

function filter(url) {
  return ignore_urls.indexOf(url)!=-1;
}

app.use((req, res, next) => {
  if (filter(req.path) || req.session.name) {
    next();
  } else {
    const err = new Error('Unauthorized');
    err.status = 401;
    res.status(err.status);
    res.json(new Result(err.status, err.message));
  }
});

app.use('/', page);
app.use('/user', user);
app.use('/api', api);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
