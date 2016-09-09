import mongoose from 'mongoose';

const file = new mongoose.Schema({
  name: { type:String, unique: true },
  type: String,
  key: { type:String, unique: true },
  md5: String,
  version: { type: Number, default: 0 },
  createTime: { type: Date, default: Date.now },
  uploadTime: { type: Date, default: Date.now }
});

export default mongoose.model('File', file);
