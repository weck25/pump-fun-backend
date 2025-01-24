import mongoose from "mongoose";
import AdminData from '../models/AdminData';

require("dotenv").config("../.env");
const DB_CONNECTION = process.env.MONGODB_URI;

export const init = () => {
  if (DB_CONNECTION === undefined) return;
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected)
    return;
  mongoose
    .connect(DB_CONNECTION)
    .then(async (v) => {
      console.log(`mongodb database connected`);
      const adminData = await AdminData.findOne();
      if (!adminData) {
        const newAdminData = new AdminData({
          admin: [
            '0x92A0A73C61C912e27701066Ebb664d1d3e7C8cBE',
            '0xb5C64BfD79f0048EA88E1699834273704aBAB3D3',
            '0xd1DD7014C690374e113AF710886097e6B68CBCdF'
          ],
          feeAddress: '0x92A0A73C61C912e27701066Ebb664d1d3e7C8cBE',
          creatorReward: 0,
          velasFunReward: 0,
          graduationMarketCap: 1.8,
          kingPercent: 65,
          feePercent: 1,
          creationFee: 0.0003
        });
        await newAdminData.save()
      }
    })
    .catch((e) => {
      console.error(`mongodb error ${e}`);
    });
};