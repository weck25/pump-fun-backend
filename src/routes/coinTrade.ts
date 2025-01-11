import express from 'express';
import CoinStatus from '../models/CoinsStatus';

const router = express.Router();

router.get('/:id', async (req, res) => {
    const coinId = req.params.id;
    const perPage = parseInt(req.query.perPage as string, 10) || 10;
    const currentPage = parseInt(req.query.currentPage as string, 10) || 1;

    try {
        const coinTrade = await CoinStatus.findOne({ coinId })
            .populate('coinId')
            .populate('record.holder')
            .lean();

        if (!coinTrade) {
            return res.status(404).json({ message: 'CoinStatus not found' });
        }

        const totalRecords = coinTrade.record.length;
        const totalPages = Math.ceil(totalRecords / perPage);

        res.status(200).json({
            pagination: {
                totalItems: 0,
                totalPages,
                currentPage: currentPage.toString(),
                perPage: perPage.toString(),
            },
            trade: {
                ...coinTrade,
                record: coinTrade.record.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice((currentPage - 1) * perPage, currentPage * perPage),
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch coin trade', error });
    }
});

router.get('/coin-holders/:coinId', async (req, res) => {
    const { coinId } = req.params;
    try {
        const coinTrade = await CoinStatus.findOne({ coinId })
            .populate('coinId')
            .populate('record.holder')
            .lean();

        if (!coinTrade) return res.status(404).json({ message: 'Coin Status not found' });

        return res.status(200).json(coinTrade.record);
    } catch (error) {
        return res.status(500).json({ message: 'Server Error' });
    }
})

router.get('/user-holdings/:userId', async (req, res) => {
    const { userId } = req.params;
    const perPage = parseInt(req.query.perPage as string, 10) || 10;
    const currentPage = parseInt(req.query.currentPage as string, 10) || 1;

    try {
        const coinStatuses = await CoinStatus.find().populate('coinId').lean();

        const userHoldings: any[] = [];

        coinStatuses.forEach(coinStatus => {
            const { coinId, record } = coinStatus;
            const userRecords = record.filter(record => String(record.holder) === userId);

            const totalAmount = userRecords.reduce((sum, record) => {
                const multiplier = (-1) ** (record.holdingStatus);
                return sum + multiplier * record.tokenAmount;
            }, 0);

            if (totalAmount !== 0) {
                userHoldings.push({ coin: coinId, totalAmount });
            }
        });

        const totalItems = userHoldings.length;
        const totalPages = Math.ceil(totalItems / perPage);

        const startIndex = (currentPage - 1) * perPage;
        const paginatedHoldings = userHoldings.slice(startIndex, startIndex + perPage);

        res.status(200).json({
            pagination: {
                totalItems,
                totalPages,
                currentPage: currentPage.toString(),
                perPage: perPage.toString(),
            },
            holdings: paginatedHoldings
        });
    } catch (error) {
        console.error('Error fetching user holdings: ', error);
        res.status(500).json({ message: 'Server error' });
    }
});



export default router;
