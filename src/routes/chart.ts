import express from "express";
import NodeCache from "node-cache";
import { logger } from "../sockets/logger";
import { fetchPriceChartData } from "../utils/chart";
import { getIo } from "../sockets";



const router = express.Router();

// @route   GET /coin/
// @desc    Get all created coins
// @access  Public
router.get('/:pairIndex/:start/:end/:range/:token', async (req, res) => {
  console.log("config+++")
  const { pairIndex, start, end, range, token } = req.params
  //  logger.info(`  get charts for pairIndex: ${pairIndex}, start: ${start}, end: ${end}, range: ${range}, token: ${token}`);
  try {
    const data = await fetchPriceChartData(parseInt(pairIndex), parseInt(start), parseInt(end), parseInt(range), token);
    return res.status(200).send({ table: data });
  } catch (e) {
    console.error(e);
    return res.status(500).send({});
  }
})

router.get('/test', async (req, res) => {
  const io = getIo();
  const { price, name } = req.query;
  const randomValue = (Math.random() * 0.000002) - 0.000001;
  io.emit(`price-update-${name}`, { price: Number(price) + randomValue })
  res.status(200).json({})
})

export default router;


