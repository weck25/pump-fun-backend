// models/AdminData.ts
import mongoose from 'mongoose';

const adminDataSchema = new mongoose.Schema(
    {
        admin: [{ type: String }],
        feePercent: { type: Number, default: 1 },
        feeAddress: { type: String },
        creationFee: { type: Number, default: 0.0007 },
        creatorReward: { type: Number, default: 100 },
        velasFunReward: { type: Number, default: 100 },
        graduationMarketCap: { type: Number, default: 1.75 },
        siteKill: { type: Boolean, default: false },
        logoTitle: { type: String, default: '' },
        logoUrl: { type: String, default: '' },
        facebook: { type: String, default: '' },
        twitter: { type: String, default: '' },
        youtube: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        bannerUrl: { type: String, default: '' },
        bannerTitle: { type: String, default: '' },
        bannerContent: { type: String, default: '' },
        footerContent: { type: String, default: '' },
        policy: { type: String, default: '' },
        terms: { type: String, default: '' },
        currentKing: { type: String },
        kingPercent: { type: Number, default: 50 }
    },
    { timestamps: true }
);

const AdminData = mongoose.model('AdminData', adminDataSchema);

export default AdminData;
