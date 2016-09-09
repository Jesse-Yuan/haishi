import mongoose from 'mongoose';

const log = new mongoose.Schema({
  client: String,
  event: String,
  description: String,
  createTime: { type: Date, default: Date.now },
});

export default mongoose.model('Log', log);

export const EVENT = {
  connect: 'connect',
  time: 'time',
  upload: 'upload',
  download: 'download',
  disconnect: 'disconnect'
};
