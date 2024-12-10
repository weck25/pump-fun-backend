import express from "express";
import Joi, { string } from "joi";
import Coin from "../models/Coin";
import { AuthRequest, auth } from "../middleware/authorization";
import { createToken, swapTx } from "../program/web3";
import { Types } from "mongoose";
import { Keypair, PublicKey } from "@solana/web3.js";
import CoinStatus from "../models/CoinsStatus";
import Message from "../models/Feedback";


const router = express.Router();

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
            const lastTrades = await CoinStatus.aggregate([
                { $unwind: '$record' },
                { $sort: { 'record.time': -1 } },
                { $group: { _id: '$coinId', lastTrade: { $first: '$record.time' } } },
                { $sort: { lastTrade: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]);

            const coinIdsFromTrades = lastTrades.map(trade => trade._id.toString());

            coins = await Coin.find({ ...filter, _id: { $in: coinIdsFromTrades } })
                .populate('creator')
                .lean();

            const unmatchedCoins = await Coin.find({ ...filter, _id: { $nin: coinIdsFromTrades } })
                .populate('creator')
                .lean();

            const matchedCoins: any[] = [];
            coins.forEach(coin => {
                if (coinIdsFromTrades.includes(coin._id.toString())) {
                    matchedCoins.push(coin);
                }
            });

            matchedCoins.sort((a, b) => coinIdsFromTrades.indexOf(a._id.toString()) - coinIdsFromTrades.indexOf(b._id.toString()));

            coins = [...matchedCoins, ...unmatchedCoins];

            totalCoins = coins.length;
            coins = coins.slice(skip, skip + limit);
        } else if (sortBy === 'Last Reply') {
            const lastReplies = await Message.aggregate([
                { $sort: { time: -1 } },
                { $group: { _id: '$coinId', lastReply: { $first: '$time' } } },
                { $sort: { lastReply: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]);

            const coinIdsFromReplies = lastReplies.map(reply => reply._id.toString());

            coins = await Coin.find({ ...filter, _id: { $in: coinIdsFromReplies } })
                .populate('creator')
                .lean();

            const unmatchedCoins = await Coin.find({ ...filter, _id: { $nin: coinIdsFromReplies } })
                .populate('creator')
                .lean();

            const matchedCoins: any[] = [];
            coins.forEach(coin => {
                if (coinIdsFromReplies.includes(coin._id.toString())) {
                    matchedCoins.push(coin);
                }
            });

            matchedCoins.sort((a, b) => coinIdsFromReplies.indexOf(a._id.toString()) - coinIdsFromReplies.indexOf(b._id.toString()));

            coins = [...matchedCoins, ...unmatchedCoins];

            totalCoins = coins.length;
            coins = coins.slice(skip, skip + limit);

        } else {
            const sortCriteria: { [key: string]: 1 | -1 } =
                sortBy === 'Creation Time'
                    ? { date: -1 }
                    : sortBy === 'Market Cap'
                        ? { reserveTwo: -1 }
                        : {};
            coins = await Coin.find(filter)
                .populate('creator')
                .sort(sortCriteria as { [key: string]: 1 | -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            totalCoins = await Coin.countDocuments(filter);
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
    } catch (error) {
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
        const coin = await Coin.findOne({ _id: id }).populate('creator').lean();
        const coinStatus = await CoinStatus.findOne({coinId: id});
        const lastPrice = coinStatus?.record ? coinStatus.record[coinStatus?.record.length - 1].price : 0.00003;
        const coinWithPrice = {
            ...coin,
            price: lastPrice
        }
        return res.status(200).json(coinWithPrice);
    } catch (error) {
        res.status(500).json({ error })
    }
})


// @route   GET /coin/user/:userID
// @desc    Get coins created by userID
// @access  Public
router.get('/user/:userID', (req, res) => {
    const creator = req.params.userID;
    Coin.find({ creator }).populate('creator').then(users => res.status(200).send(users)).catch(err => res.status(400).json('Nothing'))
})

// @route   POST /coin
// @desc    Create coin
// @access  Public
router.post('/', async (req, res) => {
    console.log("++++++++Create coin++++++++++", req.body.creator)
    const { body } = req;
    const UserSchema = Joi.object().keys({
        creator: Joi.string().required(),
        name: Joi.string().required(),
        ticker: Joi.string().required(),
        description: Joi.string(),
        url: Joi.string().required(),
        twitter: Joi.allow('').optional(),
        telegram: Joi.allow('').optional(),
        website: Joi.allow('').optional(),
        logo: Joi.object().optional(),
        reserveOne: Joi.number().optional(),
        reserveTwo: Joi.number().optional(),
        token: Joi.allow('').optional()
    });
    // console.log(req.user);
    const inputValidation = UserSchema.validate(body);
    // console.log(inputValidation)
    if (inputValidation.error) {
        return res.status(400).json({ error: inputValidation.error.details[0].message })
    }
    // Create Token with UMI
    const token: any = await createToken({
        name: req.body.name,
        ticker: req.body.ticker,
        url: req.body.url,
        creator: req.body.creator,
        description: req.body.description,
        website: req.body.website || '',
        telegram: req.body.telegram || '',
        twitter: req.body.twitter || ''
    });
    console.log("token====", token)
    if (token == "transaction failed") return res.status(400).json("fialed")
    res.status(200).send(token)
    // const name = body.name;
    // const coinName = await Coin.findOne({ name })
    // if (coinName) return res.status(400).json("Name is invalid")
    // const coinData = await Coin.findOne({ token })
    // if (coinData) return res.status(400).json("This coin is already created.")

})

// @route   POST /coin/:coinId
// @desc    Update coin
// @access  Public
router.post('/:coinId', (req, res) => {
    const { body } = req;
    const coinId = req.params.coinId;
    console.log(body)
    Coin.updateOne({ _id: coinId }, { $set: body })
        .then((updateCoin) => {
            console.log(updateCoin)
            res.status(200).send(updateCoin)
        })
        .catch(err => res.status(400).json("update is failed!!"));
})

export default router;
