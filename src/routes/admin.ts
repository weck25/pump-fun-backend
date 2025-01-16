import express from "express";
import User from "../models/User";
import Coin from "../models/Coin";
import CoinStatus from "../models/CoinsStatus";
import AdminData from "../models/AdminData";
import { adminAuth } from "../middleware/authorization";
import multer from 'multer';
import path from "path";
import fs from 'fs';
import FAQ from "../models/FAQ";
import Transaction from "../models/Transaction";
import moment from "moment";
import Message from "../models/Feedback";

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

const getCoinOverview = async () => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const currentMonthCoins = await Coin.countDocuments({
        $or: [
            { createdAt: { $gte: startOfCurrentMonth } },
            { date: { $gte: startOfCurrentMonth } },
        ]
    });

    const previousMonthCoins = await Coin.countDocuments({
        $or: [
            { createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth } },
            { date: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth } }
        ]
    });

    const growthRate =
        previousMonthCoins === 0
            ? currentMonthCoins > 0
                ? 100
                : 0
            : ((currentMonthCoins - previousMonthCoins) / previousMonthCoins) * 100;

    const coin = {
        total: currentMonthCoins,
        rate: growthRate,
        levelUp: previousMonthCoins < currentMonthCoins,
        levelDown: previousMonthCoins > currentMonthCoins
    }

    return coin;
}

const getBalanceOverview = async () => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const result = await CoinStatus.aggregate([
        { $unwind: '$record' },
        {
            $project: {
                month: {
                    $cond: {
                        if: { $gte: ['$record.time', startOfCurrentMonth] },
                        then: 'current',
                        else: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gte: ['$record.time', startOfPreviousMonth] },
                                        { $lte: ['$record.time', endOfPreviousMonth] }
                                    ]
                                },
                                then: 'previous',
                                else: null
                            }
                        }
                    }
                },
                amount: {
                    $divide: [
                        { $multiply: ['$record.amount', '$record.feePercent'] },
                        100
                    ]
                },
                holdingStatus: '$record.holdingStatus',
                tokenPrice: '$record.price',
            }
        },
        { $match: { month: { $in: ['current', 'previous'] } } },
        {
            $facet: {
                currentMonth: [
                    { $match: { month: 'current' } },
                    {
                        $group: {
                            _id: null,
                            totalBuyAmount: {
                                $sum: {
                                    $cond: [{ $eq: ['$holdingStatus', 2] }, '$amount', 0]
                                }
                            },
                            totalSellAmount: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$holdingStatus', 1] },
                                        {
                                            $divide: [
                                                {
                                                    $multiply: [{
                                                        $divide: [
                                                            { $multiply: ['$record.amount', '$record.feePercent'] },
                                                            100
                                                        ]
                                                    }, '$tokenPrice']
                                                },
                                                1000000
                                            ]
                                        },
                                        0
                                    ]
                                }
                            }
                        }
                    }
                ],
                previousMonth: [
                    { $match: { month: 'previous' } },
                    {
                        $group: {
                            _id: null,
                            totalBuyAmount: {
                                $sum: {
                                    $cond: [{ $eq: ['$holdingStatus', 2] }, {
                                        $divide: [
                                            { $multiply: ['$amount', '$feePercent'] },
                                            100
                                        ]
                                    }, 0]
                                }
                            },
                            totalSellAmount: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$holdingStatus', 1] },
                                        {
                                            $divide: [
                                                { $multiply: ['$amount', '$tokenPrice'] },
                                                1000000
                                            ]
                                        },
                                        0
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        },
        {
            $project: {
                currentMonthBalance: {
                    $ifNull: [
                        {
                            $subtract: [
                                { $arrayElemAt: ['$currentMonth.totalBuyAmount', 0] },
                                { $arrayElemAt: ['$currentMonth.totalSellAmount', 0] }
                            ]
                        },
                        0
                    ]
                },
                previousMonthBalance: {
                    $ifNull: [
                        {
                            $subtract: [
                                { $arrayElemAt: ['$previousMonth.totalBuyAmount', 0] },
                                { $arrayElemAt: ['$previousMonth.totalSellAmount', 0] }
                            ]
                        },
                        0
                    ]
                }
            }
        }
    ]);

    const currentMonthBalance = result[0]?.currentMonthBalance || 0;
    const previousMonthBalance = result[0]?.previousMonthBalance || 0;

    const growthRate =
        previousMonthBalance === 0
            ? currentMonthBalance > 0
                ? 100
                : 0
            : ((currentMonthBalance - previousMonthBalance) / previousMonthBalance) * 100;

    return {
        total: currentMonthBalance,
        rate: growthRate,
        levelUp: currentMonthBalance > previousMonthBalance,
        levelDown: currentMonthBalance < previousMonthBalance,
    };
};

const getTxOverview = async () => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const previousMonthRecordCount = await CoinStatus.aggregate([
        { $unwind: "$record" },
        { $match: { "record.time": { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth } } },
        { $count: "previousMonthRecordCount" }
    ]);

    const currentMonthRecordCount = await CoinStatus.aggregate([
        { $unwind: "$record" },
        { $match: { "record.time": { $gte: startOfCurrentMonth } } },
        { $count: "currentMonthRecordCount" }
    ]);

    const previousMonthTxCount = previousMonthRecordCount[0]?.previousMonthRecordCount || 0;
    const currentMonthTxCount = currentMonthRecordCount[0]?.currentMonthRecordCount || 0;

    const growthRate =
        previousMonthTxCount === 0
            ? currentMonthTxCount > 0
                ? 100
                : 0
            : ((currentMonthTxCount - previousMonthTxCount) / previousMonthTxCount) * 100;

    const transaction = {
        total: currentMonthTxCount,
        rate: growthRate,
        levelUp: previousMonthTxCount < currentMonthTxCount,
        levelDown: previousMonthTxCount > currentMonthTxCount
    }

    return transaction;
}

const getUserOverview = async () => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const currentMonthUsers = await User.countDocuments({
        createdAt: { $gte: startOfCurrentMonth },
    });

    const previousMonthUsers = await User.countDocuments({
        createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth }
    });

    const growthRate =
        previousMonthUsers === 0
            ? currentMonthUsers > 0
                ? 100
                : 0
            : ((currentMonthUsers - previousMonthUsers) / previousMonthUsers) * 100;

    const user = {
        total: currentMonthUsers,
        rate: growthRate,
        levelUp: previousMonthUsers <= currentMonthUsers,
        levelDown: previousMonthUsers > currentMonthUsers
    }

    return user;
}

const getBalanceAndTokenAmount = async (option: string) => {
    const now = new Date();
    let start: Date;
    let end: Date;
    let intervalUnit: 'hour' | 'day';
    let totalUnits: number;

    if (option === 'day') {
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        intervalUnit = 'hour';
        totalUnits = 24;
    } else if (option === 'week') {
        const dayOfWeek = now.getUTCDay();
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek));
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        intervalUnit = 'day';
        totalUnits = 7;
    } else if (option === 'month') {
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        intervalUnit = 'day';
        totalUnits = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    } else {
        throw new Error('Invalid option for chart data.');
    }

    const fullTimeline = Array.from({ length: totalUnits }, (_, i) => {
        const time = new Date(start.getTime());
        if (intervalUnit === 'hour') {
            time.setHours(i);
        } else if (intervalUnit === 'day') {
            time.setDate(start.getDate() + i);
        }
        return {
            time: time.toISOString(),
            balance: 0,
            createdTokens: 0
        };
    });

    const balanceData = await CoinStatus.aggregate([
        { $unwind: '$record' },
        { $match: { 'record.time': { $gte: start, $lt: end } } },
        {
            $project: {
                time: {
                    $dateToString: {
                        format: intervalUnit === 'hour' ? '%Y-%m-%dT%H:00:00.000Z' : '%Y-%m-%dT00:00:00.000Z',
                        date: '$record.time'
                    }
                },
                holdingStatus: '$record.holdingStatus',
                amount: {
                    $divide: [
                        { $multiply: ['$record.amount', '$record.feePercent'] },
                        100
                    ]
                },
                tokenPrice: '$record.price'
            }
        },
        {
            $group: {
                _id: '$time',
                totalBuyAmount: {
                    $sum: {
                        $cond: [{ $eq: ['$holdingStatus', 2] }, {
                            $divide: [
                                { $multiply: ['$amount', '$feePercent'] },
                                100
                            ]
                        }, 0]
                    }
                },
                totalSellAmount: {
                    $sum: {
                        $cond: [
                            { $eq: ['$holdingStatus', 1] },
                            {
                                $divide: [
                                    { $multiply: ['$amount', '$tokenPrice'] },
                                    1000000
                                ]
                            },
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                time: '$_id',
                balance: { $subtract: ['$totalBuyAmount', '$totalSellAmount'] },
                _id: 0
            }
        }
    ]);

    const createdTokensData = await Coin.aggregate([
        { $match: { date: { $gte: start, $lt: end } } },
        {
            $project: {
                time: {
                    $dateToString: {
                        format: intervalUnit === 'hour' ? '%Y-%m-%dT%H:00:00.000Z' : '%Y-%m-%dT00:00:00.000Z',
                        date: '$date'
                    }
                }
            }
        },
        {
            $group: {
                _id: '$time',
                createdTokens: { $sum: 1 }
            }
        }
    ]);
    console.log(balanceData, fullTimeline)
    const balanceMap = new Map(balanceData.map(item => [item.time, item]));
    const tokenMap = new Map(createdTokensData.map(item => [item._id, item]));

    const mergedData = fullTimeline.map(item => {
        const balance = balanceMap.get(item.time)?.balance || 0;
        const createdTokens = tokenMap.get(item.time)?.createdTokens || 0;
        return {
            ...item,
            balance,
            createdTokens
        };
    });

    return mergedData;
}

const getWeekRange = (isCurrentWeek: boolean) => {
    const now = new Date();
    const dayOfWeek = now.getDay();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    if (isCurrentWeek) {
        return { start: startOfWeek, end: endOfWeek };
    } else {
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfWeek.getDate() - 7);

        const endOfLastWeek = new Date(endOfWeek);
        endOfLastWeek.setDate(endOfWeek.getDate() - 7);

        return { start: startOfLastWeek, end: endOfLastWeek };
    }
};

const getBuyAndSellCountByDay = async (isCurrentWeek: boolean) => {
    const { start, end } = getWeekRange(isCurrentWeek);

    const result = await CoinStatus.aggregate([
        { $unwind: '$record' },
        {
            $match: {
                'record.time': { $gte: start, $lt: end },
            },
        },
        {
            $project: {
                holdingStatus: '$record.holdingStatus',
                time: '$record.time',
                dayOfWeek: { $dayOfWeek: '$record.time' },
            },
        },
        {
            $group: {
                _id: { dayOfWeek: '$dayOfWeek', holdingStatus: '$holdingStatus' },
                transactionCount: { $sum: 1 },
            },
        },
        {
            $project: {
                dayOfWeek: '$_id.dayOfWeek',
                holdingStatus: '$_id.holdingStatus',
                transactionCount: 1,
                _id: 0,
            },
        },
        {
            $sort: { dayOfWeek: 1, holdingStatus: 1 },
        },
    ]);

    const weeklyData = [
        { day: 'S', buyCount: 0, sellCount: 0 },
        { day: 'M', buyCount: 0, sellCount: 0 },
        { day: 'T', buyCount: 0, sellCount: 0 },
        { day: 'W', buyCount: 0, sellCount: 0 },
        { day: 'W', buyCount: 0, sellCount: 0 },
        { day: 'F', buyCount: 0, sellCount: 0 },
        { day: 'S', buyCount: 0, sellCount: 0 },
    ];

    result.forEach(item => {
        const dayIndex = item.dayOfWeek - 1;
        if (item.holdingStatus === 2) {
            weeklyData[dayIndex].buyCount = item.transactionCount;
        } else if (item.holdingStatus === 1) {
            weeklyData[dayIndex].sellCount = item.transactionCount;
        }
    });

    return weeklyData;
};

const deleteFile = (filePath: string) => {
    const fullFilePath = path.join(__dirname, '..', '..', filePath);
    fs.unlink(fullFilePath, (err) => {
        if (err) {
            console.error(`Error deleting file ${fullFilePath}:`, err);
        } else {
            console.log(`File deleted successfully: ${fullFilePath}`);
        }
    });
};

router.get('/overview', adminAuth, async (req, res) => {
    try {
        const coin = await getCoinOverview();
        const balance = await getBalanceOverview();
        const user = await getUserOverview();
        const transaction = await getTxOverview();

        return res.status(200).json({ coin, balance, transaction, user });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error });
    }
})

router.get('/get-balance-token', adminAuth, async (req, res) => {
    try {
        const option = req.query.option || 'day';
        const data = await getBalanceAndTokenAmount(option as string);
        return res.status(200).json(data);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error })
    }
})

router.get('/get-weekly-transaction', adminAuth, async (req, res) => {
    try {
        const option = req.query.option || 'current';
        const result = await getBuyAndSellCountByDay(option === 'current');
        return res.status(200).json(result);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error });
    }
})

router.get('/get-top-5-coins', adminAuth, async (req, res) => {
    try {
        const topCoins = await Coin.find().sort('-reserveTwo').limit(5);

        const result = await Promise.all(
            topCoins.map(async (coin) => {
                const coinStatus = await CoinStatus.findOne({ coinId: coin._id });

                const holders = coinStatus?.record.map(tx => tx.holder.toString()) || [];
                console.log(holders)
                const uniqueHolders = new Set(holders).size;
                console.log(uniqueHolders)

                const price = coin.reserveOne
                    ? coin.reserveTwo / coin.reserveOne / 1_000_000_000_000
                    : Math.floor((300_000 * 1_000_000_000_000) / 1_087_598_453) / 1_000_000_000_000_000_000_000_000;

                return {
                    id: coin.id,
                    name: coin.ticker,
                    image: coin.url,
                    marketcap: price * 1_000_000_000,
                    holders: uniqueHolders,
                    transactions: coinStatus?.record.length || 0,
                    price,
                };
            })
        );

        return res.status(200).json(result);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'An error occurred while fetching top coins' });
    }
});

router.get('/get-admin-data', adminAuth, async (req, res) => {
    try {
        const adminData = await AdminData.findOne();
        return res.status(200).json(adminData);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'An error occurred while fetching top coins' });
    }
})

router.post('/update', adminAuth, async (req, res) => {
    try {
        const data = req.body;
        const adminData = await AdminData.findOneAndUpdate({}, data, { new: true });
        return res.status(200).json(adminData);
    } catch (error) {
        console.log(error);
        return res.status(500).json(error)
    }
})

router.post('/update-logo-info', adminAuth, upload.single('logoUrl'), async (req, res) => {
    try {
        const { logoTitle, logoRemoved } = req.body;
        const updatedLogoInfo: { logoTitle: string, logoUrl?: string } = { logoTitle }

        if (req.file) {
            updatedLogoInfo.logoUrl = `uploads/${req.file.filename}`;
        }

        if (logoRemoved) updatedLogoInfo.logoUrl = '';

        const adminData = await AdminData.findOne();
        if ((updatedLogoInfo.logoUrl || logoRemoved) && adminData?.logoUrl) deleteFile(adminData?.logoUrl);

        const adminData_ = await AdminData.findOneAndUpdate({}, updatedLogoInfo, { new: true });

        res.status(200).json(adminData_)
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
})

router.post('/update-banner-info', adminAuth, upload.single('bannerUrl'), async (req, res) => {
    try {
        const { bannerTitle, bannerContent, bannerRemoved } = req.body;
        const updatedbannerInfo: { bannerTitle: string, bannerContent: string, bannerUrl?: string } = { bannerTitle, bannerContent }

        if (req.file) {
            updatedbannerInfo.bannerUrl = `uploads/${req.file.filename}`;
        }

        if (bannerRemoved) updatedbannerInfo.bannerUrl = '';

        const adminData = await AdminData.findOne();
        if ((updatedbannerInfo.bannerUrl || bannerRemoved) && adminData?.bannerUrl) deleteFile(adminData?.bannerUrl);

        const adminData_ = await AdminData.findOneAndUpdate({}, updatedbannerInfo, { new: true });

        res.status(200).json(adminData_)
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
})

router.get('/get-metadata', async (req, res) => {
    try {
        const adminData = await AdminData.findOne({}, 'logoTitle logoUrl bannerTitle bannerContent bannerUrl footerContent facebook twitter youtube linkedin policy terms siteKill kingPercent');
        return res.status(200).json(adminData)
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }

})

router.get('/faqs', async (req, res) => {
    try {
        const faqs = await FAQ.find();
        return res.status(200).json(faqs)
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
})

router.post('/faqs', adminAuth, async (req, res) => {
    try {
        const { question, answer } = req.body;
        const newFaq = new FAQ({ question, answer });
        await newFaq.save();
        return res.status(201).json(newFaq)
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
})

router.put('/faqs/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer } = req.body;
        const updatedFaq = await FAQ.findByIdAndUpdate(id, { question, answer }, { new: true });
        return res.status(200).json(updatedFaq);
    } catch (error) {
        console.log(error)
        return res.status(500).json(error);
    }
})

router.delete('/faqs/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await FAQ.findByIdAndDelete(id);
        return res.status(204).send();
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
})

router.get('/get-txs', adminAuth, async (req, res) => {
    try {
        const txs = await Transaction.find().populate('user');
        return res.status(200).json(txs)
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
})

router.get('/get-total-profit', adminAuth, async (req, res) => {
    try {
        const totalProfit = await Transaction.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" }
                }
            }
        ]);

        const total = totalProfit.length > 0 ? totalProfit[0].totalAmount : 0;

        return res.status(200).json({ total });
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
})

router.get("/get-profit-data", adminAuth, async (req, res) => {
    try {
        const { option } = req.query;
        const now = new Date();

        let start: Date;
        let end: Date;
        let intervalUnit: string;
        let totalUnits: number;

        if (option === "day") {
            start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
            intervalUnit = "hour";
            totalUnits = 24;
        } else if (option === "week") {
            const dayOfWeek = now.getUTCDay();
            start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek));
            end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
            intervalUnit = "day";
            totalUnits = 7;
        } else if (option === "month") {
            start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
            end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
            intervalUnit = "day";
            totalUnits = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
        } else {
            return res.status(400).json({ error: "Invalid option specified." });
        }

        const fullTimeline = Array.from({ length: totalUnits }, (_, i) => {
            const time = new Date(start.getTime());
            if (intervalUnit === "hour") {
                time.setUTCHours(i);
            } else if (intervalUnit === "day") {
                time.setUTCDate(start.getUTCDate() + i);
            }
            return {
                time: time.toISOString(),
                profit: 0,
            };
        });

        const transactions = await Transaction.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lt: end },
                },
            },
            {
                $group: {
                    _id: {
                        $switch: {
                            branches: [
                                { case: { $eq: [option, "day"] }, then: { $hour: "$createdAt" } },
                                { case: { $eq: [option, "week"] }, then: { $dayOfWeek: "$createdAt" } },
                                { case: { $eq: [option, "month"] }, then: { $dayOfMonth: "$createdAt" } },
                            ],
                            default: { $hour: "$createdAt" },
                        },
                    },
                    totalProfit: { $sum: "$amount" },
                },
            },
        ]);

        const result = fullTimeline.map((interval) => {
            const matchingTransaction = transactions.find((t) => {
                if (option === "day") {
                    return moment(interval.time).format('HH') === moment(t._id).format('HH');
                } else if (option === "week") {
                    return moment(interval.time).isoWeekday() === t._id;
                } else if (option === "month") {
                    return parseInt(interval.time.slice(8, 10)) === t._id;
                }
                return false;
            });

            return {
                time: interval.time,
                profit: matchingTransaction ? matchingTransaction.totalProfit : 0,
            };
        });

        return res.json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json(error);
    }
});

router.delete('/delete-token', adminAuth, async (req, res) => {
    try {
        const { id } = req.query;
        
        const adminData = await AdminData.findOne();
        if (adminData && adminData?.currentKing === id) {
            adminData.currentKing = '';
            await adminData.save();
        }

        await Message.deleteMany({ coinId: id });
        await CoinStatus.deleteMany({ coinId: id });
        await Coin.deleteOne({ _id: id });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false });
    }
})


export default router;