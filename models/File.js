import mongoose from 'mongoose';
import {timeFormat} from '../lib/Format';

const file = new mongoose.Schema({
  name: { type:String, unique: true },
  type: String,
  key: { type:String, unique: true },
  md5: String,
  version: { type: Number, default: 0 },
  createTime: {
    type: Date,
    default: Date.now,
    get: timeFormat
  },
  uploadTime: {
    type: Date,
    default: Date.now,
    get: timeFormat
  }
});

file.set('toJSON', { getters: true});

export default mongoose.model('File', file);
