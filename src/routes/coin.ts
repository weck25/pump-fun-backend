import express from "express";
import Joi from "joi";
import Coin from "../models/Coin";
import CoinStatus from "../models/CoinsStatus";
import Message from "../models/Feedback";
import {
    BuyTokenTxResult,
    CreateTokenTxResult,
    pollBuyTokenEventFromVelas,
    pollCreateEventFromVelas,
    pollSellTokenEventFromVelas,
    ResultType,
    SellTokenTxResult
} from "../program/VelasFunContractService";
import { getIo } from "../sockets";
import { setCoinStatus } from "./coinStatus";
import User from "../models/User";

const router = express.Router();
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
        const coinStatus = await CoinStatus.findOne({ coinId: id });
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
router.get('/user/:userID', async (req, res) => {
    const creator = req.params.userID;
    const perPage = parseInt(req.query.perPage as string, 10) || 10;
    const currentPage = parseInt(req.query.currentPage as string, 10) || 1;

    try {
        const skip = (currentPage - 1) * perPage;

        const coins = await Coin.find({ creator })
            .populate('creator')
            .skip(skip)
            .limit(perPage)
            .lean();

        const totalItems = await Coin.countDocuments({ creator });
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
    } catch (err) {
        console.error('Error fetching coins:', err);
        res.status(400).json({ message: 'Nothing' });
    }
});

// @route   POST /coin
// @desc    Create coin
// @access  Public
router.post('/', async (req, res) => {
    const { txHash, coin } = req.body;
    const io = getIo();

    if (!txHash) {
        return res.status(400).json({ success: false, message: 'txHash is required' });
    }

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

    const inputValidation = UserSchema.validate(coin);
    if (inputValidation.error) {
        return res.status(400).json({ error: inputValidation.error.details[0].message })
    }

    const { success, txResult }: { success: boolean, txResult: CreateTokenTxResult | null } = await pollCreateEventFromVelas(txHash);
    if (!txResult || !success) return res.status(404).json({ success: false, message: 'Transaction receipt not found' });

    const oldCoin = await Coin.findOne({ token: (txResult as CreateTokenTxResult).tokenAddress });

    if (oldCoin) return res.status(404).json({ success: false, message: 'Coin already saved' });

    const urlSeg = coin.url.split('/');
    const url = `${PINATA_GATEWAY_URL}/${urlSeg[urlSeg.length - 1]}`;

    const newCoin = new Coin({
        creator: coin.creator,
        name: coin.name,
        ticker: coin.ticker,
        description: coin.description,
        token: (txResult as CreateTokenTxResult).tokenAddress,
        twitter: coin.twitter,
        telegram: coin.telegram,
        website: coin.website,
        url,
    });
    const _newCoin = await newCoin.save();

    const { amount, price } = txResult;
    const record = [
        {
            holder: _newCoin.creator,
            holdingStatus: 2,
            amount: 0,
            tx: txHash,
            price: Math.floor(300_000 * 1_000_000_000_000 / 1_473_459_215) / 1_000_000_000_000
        },
    ]
    if (BigInt(amount) !== 0n) record.push({
        holder: _newCoin.creator,
        holdingStatus: 2,
        amount: Number(amount),
        tx: txHash,
        price: Number(price) / 1_000_000_000_000
    })

    const newCoinStatus = new CoinStatus({
        coinId: _newCoin._id,
        record: record
    })
    await newCoinStatus.save();
    const user = await User.findOne({ wallet: txResult.creator });
    io.emit('TokenCreated', { coin: _newCoin, user });

    res.status(200).send(_newCoin);
})

router.post('/buy-tokens', async (req, res) => {
    try {
        const { txHash } = req.body;
        if (!txHash) return res.status(400).json({ success: false, message: 'txHash is required' });
        const { success, txResult }: { success: boolean, txResult: BuyTokenTxResult | null } = await pollBuyTokenEventFromVelas(txHash);
        if (!txResult || !success) return res.status(404).json({ success: false, message: 'Transaction receipt not found' });

        const data: ResultType = {
            tx: txHash,
            owner: txResult.buyer,
            mint: txResult.tokenAddress,
            swapType: 2,
            swapAmount: txResult.amount,
            reserve1: txResult.reserve0,
            reserve2: txResult.reserve1,
            price: txResult.price
        }

        await setCoinStatus(data);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.log(error)
        return res.status(404).json({ success: false })
    }
})

router.post('/sell-tokens', async (req, res) => {
    try {
        const { txHash } = req.body;
        if (!txHash) return res.status(400).json({ success: false, message: 'txHash is required' });
        const { success, txResult }: { success: boolean, txResult: SellTokenTxResult | null } = await pollSellTokenEventFromVelas(txHash);
        if (!txResult || !success) return res.status(404).json({ success: false, message: 'Transaction receipt not found' });

        const data: ResultType = {
            tx: txHash,
            owner: txResult.seller,
            mint: txResult.tokenAddress,
            swapType: 1,
            swapAmount: txResult.tokenSold,
            reserve1: txResult.reserve0,
            reserve2: txResult.reserve1,
            price: txResult.price
        }

        await setCoinStatus(data);
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(404).json({ success: false })
    }
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
