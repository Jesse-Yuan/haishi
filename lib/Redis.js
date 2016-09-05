import config from '../config';
import redis from 'redis';

const db = redis.createClient(config.redis.port, config.redis.server);

function addClient(clientId, callback) {
  db.hset('clients', clientId, new Date(), err => {
    if(err) return callback(err);
    callback();
  });
}

function delClient(clientId, callback) {
  db.hdel('clients', clientId, err => {
    if(err) return callback(err);
    callback();
  })
}

function countClients(callback) {
  db.hlen('clients', (err, count) => {
    if(err) return callback(err);
    callback(count);
  });
}

export { addClient, delClient, countClients};
