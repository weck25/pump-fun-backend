// models/User.js
import mongoose, { Types } from 'mongoose';

const PINATA_GATEWAY_URL = process.env.PINATA_GATEWAY_URL;
const defualtImg = process.env.DEFAULT_IMG_HASH

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, },
    wallet: { type: String, required: true, unique: true },
    avatar: { type: String, default: `${PINATA_GATEWAY_URL}/${defualtImg}` },
    follower: { type: Number, default: 0 },
    bio: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;