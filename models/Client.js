import mongoose from 'mongoose';

const client = new mongoose.Schema({
  key: {type:String, unique: true},
  token: String,
  description: String,
  createTime: { type: Date, default: Date.now },
  status: { type: String, default: 'offline' },
});

export default mongoose.model('Client', client);
