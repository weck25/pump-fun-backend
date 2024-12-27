// models/Coin.ts
import mongoose from 'mongoose';

const coinSchema = new mongoose.Schema(
    {
        creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true, },
        ticker: { type: String, required: true, },
        description: { type: String },
        token: { type: String, },
        reserveOne: { type: Number, default: 0 },
        reserveTwo: { type: Number, default: 0 },
        url: { type: String, requried: true },
        twitter: { type: String },
        telegram: { type: String },
        website: { type: String },
        date: { type: Date, default: () => new Date() }
    },
    { timestamps: true }
);

const Coin = mongoose.model('Coin', coinSchema);

export default Coin;
