import CoinStatus from "../models/CoinsStatus";
import { ResultType } from "../program/VelasFunContractService";
import Coin from "../models/Coin";
import User from "../models/User";
import { getIo } from "../sockets";
import AdminData from "../models/AdminData";
import Transaction from "../models/Transaction";

export const setCoinStatus = async (data: ResultType) => {
    const io = getIo();
    
    const coin = await Coin.findOne({ token: data.mint });
    const user = await User.findOne({ wallet: data.owner });
    const adminData = await AdminData.findOne();
    
    const ethAmount = data.swapType === 2 ? Number(data.swapAmount) : (coin?.reserveTwo || 0) - Number(data.reserve2)
    const tokenAmount = data.swapType === 1 ? Number(data.swapAmount) : Number(data.reserve1) - (coin?.reserveOne || 0) 
    
    const newTransaction = new Transaction({
        type: data.swapType === 2 ? 'buy' : 'sell',
        txHash: data.tx,
        user: user?._id,
        amount: ethAmount / 100_000_000_000_000_000_000,
    });

    await newTransaction.save();
    
    if (!coin?.tradingOnUniswap) {
        const newTx = {
            holder: user?._id,
            holdingStatus: data.swapType,
            ethAmount: ethAmount / 1_000_000_000_000_000_000,
            tokenAmount: tokenAmount,
            tx: data.tx,
            price: Number(data.price) / 1_000_000_000_000,
            feePercent: adminData?.feePercent
        }
    
        const coinStatus = await CoinStatus.findOne({ coinId: coin?._id })
        
        coinStatus?.record.push(newTx);
        await coinStatus?.save()
        
        if (adminData && newTx.price * 1_000_000_000 * 2 >= (adminData?.graduationMarketCap || 5)) {
            const coin = await Coin.findOneAndUpdate({ token: data.mint }, { reserveOne: Number(data.reserve1), reserveTwo: Number(data.reserve2), kingDate: new Date() }, { new: true }).populate('creator');
            if (coin) {
                adminData.currentKing = coin.token;
                await adminData.save();
            }
            io.emit('king-changed', coin)
        }
        else {
            await Coin.findOneAndUpdate({ token: data.mint }, { reserveOne: Number(data.reserve1), reserveTwo: Number(data.reserve2) }, { new: true });
        }

        io.emit(`price-update-${coin?.token}`, { 
            price: newTx.price, 
            lastTime: coinStatus?.record[coinStatus.record.length - 1].time, 
            closedPrice: coinStatus?.record[coinStatus.record.length - 1].price 
        })

    }
    io.emit('update-bonding-curve', { tokenId: coin?._id, price: Number(data.price) / 1_000_000_000_000, reserveTwo: Number(data.reserve2) });
    io.emit('transaction', { 
        isBuy: data.swapType, 
        user: user, 
        token: coin, 
        ethAmount: ethAmount / 1_000_000_000_000_000_000, 
        tokenAmount,
        ticker: coin?.ticker, 
        tx: data.tx, 
        price: (Number(data.price) / 1_000_000_000_000).toString(),
    });
    // console.log("updated coin", updateCoin);
}
