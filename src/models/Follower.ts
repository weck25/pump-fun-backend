// models/Follower.js
import mongoose from 'mongoose';

const followerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    followers: [{
        follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    }]
});

const Follower = mongoose.model('Follower', followerSchema);

export default Follower;
