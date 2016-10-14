import mongoose from 'mongoose';
import {timeFormat} from '../lib/Format';

const log = new mongoose.Schema({
  client: String,
  event: String,
  description: String,
  createTime: {
    type: Date,
    default: Date.now,
    get: timeFormat
  },
});

log.set('toJSON', { getters: true});

export default mongoose.model('Log', log);

export const EVENT = {
  connect: 'connect',
  disconnect: 'disconnect',
  upload: 'upload',
  download: 'download'
};
