import mongoose from 'mongoose';

const file = new mongoose.Schema({
  name: { type:String, unique: true },
  type: String,
  key: { type:String, unique: true },
  createTime: { type: Date, default: Date.now },
});

export default mongoose.model('File', file);
