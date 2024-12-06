"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Feedback_1 = __importDefault(require("../models/Feedback"));
const router = express_1.default.Router();
// @route   GET /message/:
// @desc    Get messages about this coin
// @access  Public
router.get('/coin/:coinId', (req, res) => {
    const coinId = req.params.coinId;
    Feedback_1.default.find({ coinId }).populate('coinId').populate('sender')
        .then(messages => {
        console.log(messages);
        return res.status(200).send(messages);
    })
        .catch(err => res.status(400).json(err));
});
// @route   GET /message/:
// @desc    Get messages about this user
// @access  Public
router.get('/user/:userId', (req, res) => {
    const sender = req.params.userId;
    Feedback_1.default.find({ sender }).then(messages => res.status(200).send(messages))
        .catch(err => res.status(400).json(err));
});
// @route   POST /message/
// @desc    Save new Message
// @access  Public
router.post('/', async (req, res) => {
    const { body } = req;
    try {
        const PINATA_GATEWAY_URL = process.env.PINATA_GATEWAY_URL;
        const urlSeg = body.img.split('/');
        const img = `${PINATA_GATEWAY_URL}/${urlSeg[urlSeg.length - 1]}`;
        const newMsg = new Feedback_1.default({ ...body, img });
        const messages = await newMsg.save();
        return res.status(200).send(messages);
    }
    catch (err) {
        return res.status(400).json(err);
    }
});
exports.default = router;
