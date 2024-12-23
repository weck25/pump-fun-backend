"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const Coin_1 = __importDefault(require("../models/Coin"));
const CoinsStatus_1 = __importDefault(require("../models/CoinsStatus"));
const Feedback_1 = __importDefault(require("../models/Feedback"));
const VelasFunContractService_1 = require("../program/VelasFunContractService");
const sockets_1 = require("../sockets");
const coinStatus_1 = require("./coinStatus");
const router = express_1.default.Router();
const PINATA_GATEWAY_URL = process.env.PINATA_GATEWAY_URL;
// @route   GET /coin/
// @desc    Get all created coins
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { perPage = 10, currentPage = 1, sortBy = 'Creation Time', searchTerm = '' } = req.query;
        const filter = searchTerm
            ? { name: { $regex: searchTerm, $options: 'i' } }
            : {};
        let coins = [];
        let totalCoins = 0;
        const skip = (Number(currentPage) - 1) * Number(perPage);
        const limit = Number(perPage);
        if (sortBy === 'Last Trade') {
            const lastTrades = await CoinsStatus_1.default.aggregate([
                { $unwind: '$record' },
                { $sort: { 'record.time': -1 } },
                { $group: { _id: '$coinId', lastTrade: { $first: '$record.time' } } },
                { $sort: { lastTrade: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]);
            const coinIdsFromTrades = lastTrades.map(trade => trade._id.toString());
            coins = await Coin_1.default.find({ ...filter, _id: { $in: coinIdsFromTrades } })
                .populate('creator')
                .lean();
            const unmatchedCoins = await Coin_1.default.find({ ...filter, _id: { $nin: coinIdsFromTrades } })
                .populate('creator')
                .lean();
            const matchedCoins = [];
            coins.forEach(coin => {
                if (coinIdsFromTrades.includes(coin._id.toString())) {
                    matchedCoins.push(coin);
                }
            });
            matchedCoins.sort((a, b) => coinIdsFromTrades.indexOf(a._id.toString()) - coinIdsFromTrades.indexOf(b._id.toString()));
            coins = [...matchedCoins, ...unmatchedCoins];
            totalCoins = coins.length;
            coins = coins.slice(skip, skip + limit);
        }
        else if (sortBy === 'Last Reply') {
            const lastReplies = await Feedback_1.default.aggregate([
                { $sort: { time: -1 } },
                { $group: { _id: '$coinId', lastReply: { $first: '$time' } } },
                { $sort: { lastReply: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]);
            const coinIdsFromReplies = lastReplies.map(reply => reply._id.toString());
            coins = await Coin_1.default.find({ ...filter, _id: { $in: coinIdsFromReplies } })
                .populate('creator')
                .lean();
            const unmatchedCoins = await Coin_1.default.find({ ...filter, _id: { $nin: coinIdsFromReplies } })
                .populate('creator')
                .lean();
            const matchedCoins = [];
            coins.forEach(coin => {
                if (coinIdsFromReplies.includes(coin._id.toString())) {
                    matchedCoins.push(coin);
                }
            });
            matchedCoins.sort((a, b) => coinIdsFromReplies.indexOf(a._id.toString()) - coinIdsFromReplies.indexOf(b._id.toString()));
            coins = [...matchedCoins, ...unmatchedCoins];
            totalCoins = coins.length;
            coins = coins.slice(skip, skip + limit);
        }
        else {
            const sortCriteria = sortBy === 'Creation Time'
                ? { date: -1 }
                : sortBy === 'Market Cap'
                    ? { reserveTwo: -1 }
                    : {};
            coins = await Coin_1.default.find(filter)
                .populate('creator')
                .sort(sortCriteria)
                .skip(skip)
                .limit(limit)
                .lean();
            totalCoins = await Coin_1.default.countDocuments(filter);
        }
        return res.status(200).send({
            success: true,
            coins,
            pagination: {
                currentPage: Number(currentPage),
                perPage: Number(perPage),
                totalPages: Math.ceil(totalCoins / Number(perPage)),
                totalItems: totalCoins,
            },
        });
    }
    catch (error) {
        console.error('Error fetching coins:', error);
        return res.status(500).send({ success: false, message: 'Internal Server Error' });
    }
});
// @route   GET /coin/:coinid
// @desc    Get coins created by coinid
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const coin = await Coin_1.default.findOne({ _id: id }).populate('creator').lean();
        const coinStatus = await CoinsStatus_1.default.findOne({ coinId: id });
        const lastPrice = coinStatus?.record ? coinStatus.record[coinStatus?.record.length - 1].price : 0.00003;
        const coinWithPrice = {
            ...coin,
            price: lastPrice
        };
        return res.status(200).json(coinWithPrice);
    }
    catch (error) {
        res.status(500).json({ error });
    }
});
// @route   GET /coin/user/:userID
// @desc    Get coins created by userID
// @access  Public
router.get('/user/:userID', async (req, res) => {
    const creator = req.params.userID;
    const perPage = parseInt(req.query.perPage, 10) || 10;
    const currentPage = parseInt(req.query.currentPage, 10) || 1;
    try {
        const skip = (currentPage - 1) * perPage;
        const coins = await Coin_1.default.find({ creator })
            .populate('creator')
            .skip(skip)
            .limit(perPage)
            .lean();
        const totalItems = await Coin_1.default.countDocuments({ creator });
        const totalPages = Math.ceil(totalItems / perPage);
        res.status(200).json({
            pagination: {
                totalItems,
                totalPages,
                currentPage: currentPage.toString(),
                perPage: perPage.toString(),
            },
            coins
        });
    }
    catch (err) {
        console.error('Error fetching coins:', err);
        res.status(400).json({ message: 'Nothing' });
    }
});
// @route   POST /coin
// @desc    Create coin
// @access  Public
router.post('/', async (req, res) => {
    const { txHash, coin } = req.body;
    const io = (0, sockets_1.getIo)();
    if (!txHash) {
        return res.status(400).json({ success: false, message: 'txHash is required' });
    }
    const UserSchema = joi_1.default.object().keys({
        creator: joi_1.default.string().required(),
        name: joi_1.default.string().required(),
        ticker: joi_1.default.string().required(),
        description: joi_1.default.string(),
        url: joi_1.default.string().required(),
        twitter: joi_1.default.allow('').optional(),
        telegram: joi_1.default.allow('').optional(),
        website: joi_1.default.allow('').optional(),
        logo: joi_1.default.object().optional(),
        reserveOne: joi_1.default.number().optional(),
        reserveTwo: joi_1.default.number().optional(),
        token: joi_1.default.allow('').optional()
    });
    const inputValidation = UserSchema.validate(coin);
    if (inputValidation.error) {
        return res.status(400).json({ error: inputValidation.error.details[0].message });
    }
    const { success, txResult } = await (0, VelasFunContractService_1.pollCreateEventFromVelas)(txHash);
    if (!txResult || !success)
        return res.status(404).json({ success: false, message: 'Transaction receipt not found' });
    const oldCoin = await Coin_1.default.findOne({ token: txResult.tokenAddress });
    if (oldCoin)
        return res.status(404).json({ success: false, message: 'Coin already saved' });
    const urlSeg = coin.url.split('/');
    const url = `${PINATA_GATEWAY_URL}/${urlSeg[urlSeg.length - 1]}`;
    const newCoin = new Coin_1.default({
        creator: coin.creator,
        name: coin.name,
        ticker: coin.ticker,
        description: coin.description,
        token: txResult.tokenAddress,
        twitter: coin.twitter,
        telegram: coin.telegram,
        website: coin.website,
        url,
    });
    const _newCoin = await newCoin.save();
    const newCoinStatus = new CoinsStatus_1.default({
        coinId: _newCoin._id,
        record: [
            {
                holder: _newCoin.creator,
                holdingStatus: 2,
                amount: 0,
                tx: txHash,
                price: 300_000 / 1_072_892_901
            }
        ]
    });
    await newCoinStatus.save();
    io.emit('TokenCreated', coin.name, txResult.creator);
    res.status(200).send(_newCoin);
});
router.post('/buy-tokens', async (req, res) => {
    try {
        const { txHash } = req.body;
        if (!txHash)
            return res.status(400).json({ success: false, message: 'txHash is required' });
        const { success, txResult } = await (0, VelasFunContractService_1.pollBuyTokenEventFromVelas)(txHash);
        if (!txResult || !success)
            return res.status(404).json({ success: false, message: 'Transaction receipt not found' });
        const data = {
            tx: txHash,
            owner: txResult.buyer,
            mint: txResult.tokenAddress,
            swapType: 2,
            swapAmount: txResult.amount,
            reserve1: txResult.reserve0,
            reserve2: txResult.reserve1,
            price: txResult.price
        };
        await (0, coinStatus_1.setCoinStatus)(data);
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.log(error);
        return res.status(404).json({ success: false });
    }
});
router.post('/sell-tokens', async (req, res) => {
    try {
        const { txHash } = req.body;
        if (!txHash)
            return res.status(400).json({ success: false, message: 'txHash is required' });
        const { success, txResult } = await (0, VelasFunContractService_1.pollSellTokenEventFromVelas)(txHash);
        if (!txResult || !success)
            return res.status(404).json({ success: false, message: 'Transaction receipt not found' });
        const data = {
            tx: txHash,
            owner: txResult.seller,
            mint: txResult.tokenAddress,
            swapType: 1,
            swapAmount: txResult.tokenSold,
            reserve1: txResult.reserve0,
            reserve2: txResult.reserve1,
            price: txResult.price
        };
        await (0, coinStatus_1.setCoinStatus)(data);
        return res.status(200).json({ success: true });
    }
    catch (error) {
        return res.status(404).json({ success: false });
    }
});
// @route   POST /coin/:coinId
// @desc    Update coin
// @access  Public
router.post('/:coinId', (req, res) => {
    const { body } = req;
    const coinId = req.params.coinId;
    console.log(body);
    Coin_1.default.updateOne({ _id: coinId }, { $set: body })
        .then((updateCoin) => {
        console.log(updateCoin);
        res.status(200).send(updateCoin);
    })
        .catch(err => res.status(400).json("update is failed!!"));
});
exports.default = router;
