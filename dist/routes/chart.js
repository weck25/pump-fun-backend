"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chart_1 = require("../utils/chart");
const sockets_1 = require("../sockets");
const router = express_1.default.Router();
// @route   GET /coin/
// @desc    Get all created coins
// @access  Public
router.get('/:pairIndex/:start/:end/:range/:token', async (req, res) => {
    console.log("config+++");
    const { pairIndex, start, end, range, token } = req.params;
    //  logger.info(`  get charts for pairIndex: ${pairIndex}, start: ${start}, end: ${end}, range: ${range}, token: ${token}`);
    try {
        const data = await (0, chart_1.fetchPriceChartData)(parseInt(pairIndex), parseInt(start), parseInt(end), parseInt(range), token);
        return res.status(200).send({ table: data });
    }
    catch (e) {
        console.error(e);
        return res.status(500).send({});
    }
});
router.get('/test', async (req, res) => {
    const io = (0, sockets_1.getIo)();
    const { price, name } = req.query;
    const randomValue = (Math.random() * 0.000002) - 0.000001;
    io.emit(`price-update-${name}`, { price: Number(price) + randomValue });
    res.status(200).json({});
});
exports.default = router;
