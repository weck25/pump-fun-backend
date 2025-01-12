// models/Transaction.ts
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, required: true },
        amount: { type: Number, required: true },
        txHash: { type: String, required: true }
    },
    { timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
