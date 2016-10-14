import mongoose from 'mongoose';
import {timeFormat} from '../lib/Format';

const client = new mongoose.Schema({
  key: {type:String, unique: true},
  token: String,
  description: String,
  createTime: {
    type: Date,
    default: Date.now,
    get: timeFormat
  },
  status: { type: String, default: 'offline' },
  updateFile: { type: mongoose.Schema.ObjectId, ref: 'File'}
});

client.set('toJSON', { getters: true});

export default mongoose.model('Client', client);
