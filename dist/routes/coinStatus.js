"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCoinStatus = void 0;
const CoinsStatus_1 = __importDefault(require("../models/CoinsStatus"));
const Coin_1 = __importDefault(require("../models/Coin"));
const User_1 = __importDefault(require("../models/User"));
const sockets_1 = require("../sockets");
const setCoinStatus = async (data) => {
    console.log("+++++++++++++++++++++++++++++++++++++++");
    const io = (0, sockets_1.getIo)();
    const coin = await Coin_1.default.findOne({ token: data.mint });
    const user = await User_1.default.findOne({ wallet: data.owner });
    const newTx = {
        holder: user?._id,
        holdingStatus: data.swapType,
        amount: data.swapType === 2 ? Number(data.swapAmount) / 1_000_000_000_000_000_000 : Number(data.swapAmount),
        tx: data.tx,
        price: Number(data.price) / 1_000_000_000_000
    };
    const coinStatus = await CoinsStatus_1.default.findOne({ coinId: coin?._id });
    io.emit(`price-update-${coin?.name}`, { price: newTx.price });
    io.emit('transaction', { isBuy: data.swapType, user: user, token: coin, amount: newTx.amount, ticker: coin?.ticker, tx: data.tx, price: newTx.price });
    coinStatus?.record.push(newTx);
    coinStatus?.save();
    console.log("Update coin when buy or sell", data);
    const updateCoin = await Coin_1.default.findOneAndUpdate({ token: data.mint }, { reserveOne: Number(data.reserve1), reserveTwo: Number(data.reserve2) }, { new: true });
    io.emit('update-bonding-curve', { tokenId: coin?._id, reserveOne: Number(data.reserve1), reserveTwo: Number(data.reserve2) });
    // console.log("updated coin", updateCoin);
};
exports.setCoinStatus = setCoinStatus;
