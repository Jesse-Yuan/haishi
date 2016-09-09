import express from 'express';
import mongoose from 'mongoose';
import bluebird from 'bluebird';
import path from 'path';
import logger from 'morgan';
import favicon from 'serve-favicon';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';

import config from './config';
import message from './lib/middleware/message';

import user from './routes/user';
import api from './routes/api';
import page from './routes/page';


const uri = `${config.mongo.server}/${config.mongo.dbname}`;
const options = { promiseLibrary: bluebird};

mongoose.Promise = bluebird;
mongoose.connect(uri, options);
mongoose.connection.on('error', () => {
  console.error('Error: Could not connect to MongoDB.');
});


const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger(app.get('env') === 'development' ? 'dev' : 'common'));
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
const ignore_urls = [ '/', '/user/login', '/user/logout'];
app.use((req, res, next) => {
  if (ignore_urls.indexOf(req.path)!=-1 || req.session.name) {
    next();
  } else {
    const err = new Error('Unauthorized');
    err.status = 401;
    res.status(err.status);
    res.end(err.message);
  }
});

//路由
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
