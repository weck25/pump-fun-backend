"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const Coin_1 = __importDefault(require("../models/Coin"));
const web3_1 = require("../program/web3");
const CoinsStatus_1 = __importDefault(require("../models/CoinsStatus"));
const Feedback_1 = __importDefault(require("../models/Feedback"));
const router = express_1.default.Router();
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
router.get('/user/:userID', (req, res) => {
    const creator = req.params.userID;
    Coin_1.default.find({ creator }).populate('creator').then(users => res.status(200).send(users)).catch(err => res.status(400).json('Nothing'));
});
// @route   POST /coin
// @desc    Create coin
// @access  Public
router.post('/', async (req, res) => {
    console.log("++++++++Create coin++++++++++", req.body.creator);
    const { body } = req;
    const UserSchema = joi_1.default.object().keys({
        creator: joi_1.default.string().required(),
        name: joi_1.default.string().required(),
        ticker: joi_1.default.string().required(),
        description: joi_1.default.string(),
        url: joi_1.default.string().required(),
    });
    // console.log(req.user);
    const inputValidation = UserSchema.validate(body);
    // console.log(inputValidation)
    if (inputValidation.error) {
        return res.status(400).json({ error: inputValidation.error.details[0].message });
    }
    // Create Token with UMI
    const token = await (0, web3_1.createToken)({
        name: req.body.name,
        ticker: req.body.ticker,
        url: req.body.url,
        creator: req.body.creator,
        description: req.body.description,
    });
    console.log("token====", token);
    if (token == "transaction failed")
        res.status(400).json("fialed");
    res.status(200).send(token);
    // const name = body.name;
    // const coinName = await Coin.findOne({ name })
    // if (coinName) return res.status(400).json("Name is invalid")
    // const coinData = await Coin.findOne({ token })
    // if (coinData) return res.status(400).json("This coin is already created.")
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
