// models/CoinStatus.ts
import mongoose from 'mongoose';

const coinStatusSchema = new mongoose.Schema(
    {
        coinId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coin', required: true },
        record: [{
            holder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            holdingStatus: { type: Number, required: true },
            time: { type: Date, default: Date.now },
            ethAmount: { type: Number, default: 0 },
            tokenAmount: { type: Number, default: 0 },
            price: { type: Number, required: true },
            tx: { type: String, required: true },
            feePercent: { type: Number, required: true }
        }]
    },
    { timestamps: true }
);

const CoinStatus = mongoose.model('CoinStatus', coinStatusSchema);

export default CoinStatus;
