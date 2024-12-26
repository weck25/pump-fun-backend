import express from "express";
import User from "../models/User";
import Coin from "../models/Coin";
import CoinStatus from "../models/CoinsStatus";

const router = express.Router();

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
                amount: '$record.amount',
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
                ],
                previousMonth: [
                    { $match: { month: 'previous' } },
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
                amount: '$record.amount',
                tokenPrice: '$record.price'
            }
        },
        {
            $group: {
                _id: '$time',
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

router.get('/overview', async (req, res) => {
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

router.get('/get-balance-token', async (req, res) => {
    try {
        const option = req.query.option || 'day';
        const data = await getBalanceAndTokenAmount(option as string);
        return res.status(200).json(data);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error })
    }
})

router.get('/get-weekly-transaction', async (req, res) => {
    try {
        const option = req.query.option || 'current';
        const result = await getBuyAndSellCountByDay(option === 'current');
        return res.status(200).json(result);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error });
    }
})

router.get('/get-top-5-coins', async (req, res) => {
    try {
        const topCoins = await Coin.find().sort('-reserveTwo').limit(5);

        const result = await Promise.all(
            topCoins.map(async (coin) => {
                const coinStatus = await CoinStatus.findOne({ coinId: coin._id });

                const holders = coinStatus?.record.map(tx => tx.holder) || [];
                const uniqueHolders = new Set(holders).size;

                const price = coin.reserveOne
                    ? coin.reserveTwo / coin.reserveOne / 1_000_000_000_000
                    : Math.floor((300_000 * 1_000_000_000_000) / 1_473_459_215) / 1_000_000_000_000;

                return {
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
        console.error(error);
        return res.status(500).json({ error: 'An error occurred while fetching top coins' });
    }
});


export default router;