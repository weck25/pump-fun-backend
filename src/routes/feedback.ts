import express from "express";
import Message from "../models/Feedback";
import { getIo } from "../sockets";

const router = express.Router();

// @route   GET /message/:
// @desc    Get messages about this coin
// @access  Public
router.get('/coin/:coinId', async (req, res) => {
    const coinId: string = req.params.coinId;
    const perPage = parseInt(req.query.perPage as string, 10) || 10; 
    const currentPage = parseInt(req.query.currentPage as string, 10) || 1;

    try {
        const skip = (currentPage - 1) * perPage;

        const messages = await Message.find({ coinId })
            .populate('coinId')
            .populate('sender')
            .skip(skip)
            .limit(perPage)
            .lean();

        const totalItems = await Message.countDocuments({ coinId });
        const totalPages = Math.ceil(totalItems / perPage);

        res.status(200).json({
            pagination: {
                totalItems,
                totalPages,
                currentPage: currentPage.toString(),
                perPage: perPage.toString(),
            },
            messages
        });
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(400).json({ message: 'Failed to fetch messages' });
    }
});


// @route   GET /message/:
// @desc    Get messages about this user
// @access  Public
router.get('/user/:userId', async (req, res) => {
    const sender: string = req.params.userId;
    const perPage = parseInt(req.query.perPage as string, 10) || 10; 
    const currentPage = parseInt(req.query.currentPage as string, 10) || 1;

    try {
        const skip = (currentPage - 1) * perPage;

        const messages = await Message.find({ sender })
            .populate('coinId') 
            .skip(skip)
            .limit(perPage)
            .lean();

        const totalItems = await Message.countDocuments({ sender });
        const totalPages = Math.ceil(totalItems / perPage);

        res.status(200).json({
            pagination: {
                totalItems,
                totalPages,
                currentPage: currentPage.toString(),
                perPage: perPage.toString(),
            },
            messages
        });
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(400).json({ message: 'Failed to fetch messages' });
    }
});


// @route   POST /message/
// @desc    Save new Message
// @access  Public
router.post('/', async (req, res) => {
    const { body } = req;
    try {
        let newMsg;
        if (body.img) {
            const PINATA_GATEWAY_URL = process.env.PINATA_GATEWAY_URL;
            const urlSeg = body.img.split('/');
            const img = `${PINATA_GATEWAY_URL}/${urlSeg[urlSeg.length - 1]}`;
            newMsg = new Message({ ...body, img });
        } else {
            newMsg = new Message({ ...body });
        }
        const message = await newMsg.save();
        const populatedMessage = await message.populate('sender');
        const io = getIo();
        io.emit('new-post', populatedMessage);
        return res.status(200).send(populatedMessage)
    } catch (err) {
        return res.status(400).json(err)
    }
})

export default router;