import CoinStatus from "../models/CoinsStatus";
import { ResultType } from "../program/VelasFunContractService";
import Coin from "../models/Coin";
import User from "../models/User";
import { getIo } from "../sockets";
import AdminData from "../models/AdminData";

export const setCoinStatus = async (data: ResultType) => {
    const io = getIo();
    const coin = await Coin.findOne({ token: data.mint });
    const user = await User.findOne({ wallet: data.owner });
    if (!coin?.tradingOnUniswap) {
        const adminData = await AdminData.findOne();
        const newTx = {
            holder: user?._id,
            holdingStatus: data.swapType,
            amount: data.swapType === 2 ? Number(data.swapAmount) / 1_000_000_000_000_000_000 : Number(data.swapAmount),
            tx: data.tx,
            price: Number(data.price) / 1_000_000_000_000,
            feePercent: adminData?.feePercent
        }
    
        const coinStatus = await CoinStatus.findOne({ coinId: coin?._id })
        
        coinStatus?.record.push(newTx);
        coinStatus?.save()
        
        await Coin.findOneAndUpdate({ token: data.mint }, { reserveOne: Number(data.reserve1), reserveTwo: Number(data.reserve2) }, { new: true });
        io.emit(`price-update-${coin?.token}`, { 
            price: newTx.price, 
            lastTime: coinStatus?.record[coinStatus.record.length - 1].time, 
            closedPrice: coinStatus?.record[coinStatus.record.length - 1].price 
        })
    }
    io.emit('update-bonding-curve', { tokenId: coin?._id, price: Number(data.price) / 1_000_000_000_000 });
    io.emit('transaction', { 
        isBuy: data.swapType, 
        user: user, 
        token: coin, 
        amount: data.swapType === 2 ? (Number(data.swapAmount) / 1_000_000_000_000_000_000).toString() : Number(data.swapAmount).toString(), 
        ticker: coin?.ticker, 
        tx: data.tx, 
        price: (Number(data.price) / 1_000_000_000_000).toString(),
    });
    // console.log("updated coin", updateCoin);
}
