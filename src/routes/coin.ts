import express from "express";
import Coin from "../models/Coin";
import CoinStatus from "../models/CoinsStatus";
import Message from "../models/Feedback";
import AdminData from "../models/AdminData";

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
            coins: await Promise.all(coins.map(async coin => {
                const coinStatus = await CoinStatus.findOne({ coinId: coin._id });
                const lastPrice = coinStatus?.record
                    ? coinStatus.record[coinStatus.record.length - 1].price
                    : Math.floor(300_000 * 1_000_000_000_000 / 1_473_459_215) / 1_000_000_000_000;

                return {
                    ...coin,
                    price: lastPrice
                };
            })),
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

// @route GET /coin/get-king
// @desc get King Coin
// @access Public
router.get('/get-king-coin', async (req, res) => {
    const adminData = await AdminData.findOne();
    if (!adminData?.currentKing) return res.status(200).json(null);

    const king = await Coin.findOne({ token: adminData.currentKing }).populate('creator');
    if (!king) return res.status(200).json(null);

    const coinStatus = await CoinStatus.findOne({ coinId: king._id });
    const lastPrice = coinStatus?.record ? coinStatus.record[coinStatus?.record.length - 1].price : 0.00003;
    const coinWithPrice = {
        ...king.toObject(),
        price: lastPrice,
        graduationMarketCap: adminData?.graduationMarketCap || 5
    }
    return res.status(200).json(coinWithPrice);
})


// @route   GET /coin/:coinid
// @desc    Get coins created by coinid
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const adminData = await AdminData.findOne();
        const coin = await Coin.findOne({ _id: id }).populate('creator').lean();
        const coinStatus = await CoinStatus.findOne({ coinId: id });
        const lastPrice = coinStatus?.record ? coinStatus.record[coinStatus?.record.length - 1].price : 0.00003;
        const coinWithPrice = {
            ...coin,
            price: lastPrice,
            graduationMarketCap: adminData?.graduationMarketCap || 5
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

        // Use Promise.all to handle async operations properly
        const coinsWithPrice = await Promise.all(coins.map(async coin => {
            const coinStatus = await CoinStatus.findOne({ coinId: coin._id });
            const lastPrice = coinStatus?.record ? coinStatus.record[coinStatus.record.length - 1].price : 0.00003;
            return {
                ...coin,
                price: lastPrice
            }
        }));

        const totalItems = await Coin.countDocuments({ creator });
        const totalPages = Math.ceil(totalItems / perPage);

        res.status(200).json({
            pagination: {
                totalItems,
                totalPages,
                currentPage: currentPage.toString(),
                perPage: perPage.toString(),
            },
            coins: coinsWithPrice
        });
    } catch (err) {
        console.error('Error fetching coins:', err);
        res.status(400).json({ message: 'Nothing' });
    }
});

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
