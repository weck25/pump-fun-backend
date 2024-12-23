"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Feedback_1 = __importDefault(require("../models/Feedback"));
const sockets_1 = require("../sockets");
const router = express_1.default.Router();
// @route   GET /message/:
// @desc    Get messages about this coin
// @access  Public
router.get('/coin/:coinId', async (req, res) => {
    const coinId = req.params.coinId;
    const perPage = parseInt(req.query.perPage, 10) || 10;
    const currentPage = parseInt(req.query.currentPage, 10) || 1;
    try {
        const skip = (currentPage - 1) * perPage;
        const messages = await Feedback_1.default.find({ coinId })
            .populate('coinId')
            .populate('sender')
            .skip(skip)
            .limit(perPage)
            .lean();
        const totalItems = await Feedback_1.default.countDocuments({ coinId });
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
    }
    catch (err) {
        console.error('Error fetching messages:', err);
        res.status(400).json({ message: 'Failed to fetch messages' });
    }
});
// @route   GET /message/:
// @desc    Get messages about this user
// @access  Public
router.get('/user/:userId', async (req, res) => {
    const sender = req.params.userId;
    const perPage = parseInt(req.query.perPage, 10) || 10;
    const currentPage = parseInt(req.query.currentPage, 10) || 1;
    try {
        const skip = (currentPage - 1) * perPage;
        const messages = await Feedback_1.default.find({ sender })
            .populate('coinId')
            .skip(skip)
            .limit(perPage)
            .lean();
        const totalItems = await Feedback_1.default.countDocuments({ sender });
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
    }
    catch (err) {
        console.error('Error fetching messages:', err);
        res.status(400).json({ message: 'Failed to fetch messages' });
    }
});
// @route   POST /message/
// @desc    Save new Message
// @access  Public
router.post('/', async (req, res) => {
    const { body } = req;
    console.log('new post');
    try {
        let newMsg;
        if (body.img) {
            const PINATA_GATEWAY_URL = process.env.PINATA_GATEWAY_URL;
            const urlSeg = body.img.split('/');
            const img = `${PINATA_GATEWAY_URL}/${urlSeg[urlSeg.length - 1]}`;
            newMsg = new Feedback_1.default({ ...body, img });
        }
        else {
            newMsg = new Feedback_1.default({ ...body });
        }
        const message = await newMsg.save();
        const populatedMessage = await message.populate('sender');
        const io = (0, sockets_1.getIo)();
        io.emit('new-post', populatedMessage);
        return res.status(200).send(populatedMessage);
    }
    catch (err) {
        return res.status(400).json(err);
    }
});
exports.default = router;
