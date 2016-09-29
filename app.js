import express from 'express';
import mongoose from 'mongoose';
import bluebird from 'bluebird';
import path from 'path';
import logger from 'morgan';
import log4js from 'log4js';
import favicon from 'serve-favicon';
import bodyParser from 'body-parser';
import session from 'express-session';
import Store from 'connect-redis';

import config from './config';
import message from './lib/middleware/message';

import user from './routes/user';
import api from './routes/api';
import page from './routes/page';


const log = log4js.getLogger("console") ;


const uri = `${config.mongo.server}/${config.mongo.dbname}`;
const options = { promiseLibrary: bluebird};

mongoose.Promise = bluebird;
mongoose.connect(uri, options).then(()=>{
  let {connection} = mongoose;

  connection.on('error', (err) => {log.error(err.message);});

  connection.on('disconnected', () => {
    log.warn('MongoDB has disconnected');
  });

  connection.on('reconnected', () => {
    log.info('reconnected to MongoDB.');
  });

  process.on('SIGINT', () => {
    connection.close(() => {
      log.info('Mongoose disconnected through app termination');
      process.exit(0);
    });
  });

}).catch(err => {log.error(err.message);});


const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

if (app.get('env') === 'development') {
  app.use(session({
    secret: 'haishi',
    cookie: { maxAge: 1000*60*60 },
    resave: false,
    saveUninitialized: true
  }));
  app.use(logger('dev'));
}else{
  const RedisStore = Store(session);
  app.use(session({
    secret: 'haishi',
    store: new RedisStore({
      host: config.redis.server,
      port: config.redis.port
    }),
    cookie: { maxAge: 1000*60*60 },
    resave: true,
    saveUninitialized: true
  }));
  app.use(log4js.connectLogger(log4js.getLogger("app"), {level: 'auto'}));
}

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
