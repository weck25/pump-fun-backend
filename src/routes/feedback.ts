import express from "express";
import Message from "../models/Feedback";

const router = express.Router();

// @route   GET /message/:
// @desc    Get messages about this coin
// @access  Public
router.get('/coin/:coinId', (req, res) => {
    const coinId: string = req.params.coinId;
    Message.find({ coinId }).populate('coinId').populate('sender')
        .then(messages => {
            console.log(messages);
            return res.status(200).send(messages);
        })
        .catch(err => res.status(400).json(err));
})

// @route   GET /message/:
// @desc    Get messages about this user
// @access  Public
router.get('/user/:userId', (req, res) => {
    const sender: string = req.params.userId;
    Message.find({ sender }).then(messages => res.status(200).send(messages))
        .catch(err => res.status(400).json(err));
})

// @route   POST /message/
// @desc    Save new Message
// @access  Public
router.post('/', async (req, res) => {
    const { body } = req;
    try {
        const PINATA_GATEWAY_URL = process.env.PINATA_GATEWAY_URL;
        const urlSeg = body.img.split('/');
        const img = `${PINATA_GATEWAY_URL}/${urlSeg[urlSeg.length - 1]}`;
        const newMsg = new Message({ ...body, img });
        const messages = await newMsg.save()
        return res.status(200).send(messages)
    } catch (err) {
        return res.status(400).json(err)
    }
})

export default router;