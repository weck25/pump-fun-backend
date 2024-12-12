import CoinStatus from "../models/CoinsStatus";
import { ResultType } from "../program/web3";
import Coin from "../models/Coin";
import User from "../models/User";
import { getIo } from "../sockets";


export const setCoinStatus = async (data: ResultType) => {
    console.log("+++++++++++++++++++++++++++++++++++++++")
    const io = getIo();
    const coin = await Coin.findOne({ token: data.mint });
    const user = await User.findOne({ wallet: data.owner });
    const newTx = {
        holder: user?._id,
        holdingStatus: data.swapType,
        amount: data.swapAmount,
        tx: data.tx,
        price: data.reserve2 / data.reserve1
    }

    CoinStatus.findOne({ coinId: coin?._id })
        .then((coinStatus) => {
            io.emit(`price-update-${coin?.name}`, { price: newTx.price })
            io.emit('transaction', { isBuy: data.swapType, user: user, token: coin, amount: data.swapAmount, ticker: coin?.ticker, tx: data.tx, price: data.reserve2 / data.reserve1 })
            coinStatus?.record.push(newTx);
            coinStatus?.save()
        })
    console.log("Update coin when buy or sell", data)
    const updateCoin = await Coin.findOneAndUpdate({ token: data.mint }, { reserveOne: data.reserve1, reserveTwo: data.reserve2 }, { new: true });
    io.emit('update-bonding-curve', { tokenId: coin?._id, reserveOne: data.reserve1 });
    console.log("updat ed coin", updateCoin);
}
