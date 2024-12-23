import Coin from "../models/Coin";
import CoinStatus from "../models/CoinsStatus";
import { logger } from "../sockets/logger";
import { CandlePrice, priceFeedInfo } from "./type";

export async function fetchPriceChartData(pairIndex: number, start: number, end: number, range: number, token: string) {
  if (start >= end) {
    logger.error("Invalid start and end range: start must be less than end");
    return [];
  }

  // Fetch price history from DB within the start and end range
  const priceFeeds: priceFeedInfo[] | undefined = await Coin.findOne({ token })
    .then(async (coin) => {
      const data = await CoinStatus.findOne({ coinId: coin?._id }, { 'record.price': 1, 'record.time': 1 });
      if (!data) return [];
      return data.record.filter(feed => feed.time.getTime() / 1000 >= start && feed.time.getTime() / 1000 <= end);
    });

  if (!priceFeeds || !priceFeeds.length) {
    logger.warn("No price feed data found for the specified range.");
    return [];
  }

  // Sort price history by timestamp
  const priceHistory = priceFeeds.map((feed) => ({
    price: feed.price,
    ts: feed.time.getTime() / 1000,
  })).sort((a, b) => a.ts - b.ts);

  // Ensure priceHistory is not empty
  if (!priceHistory.length) {
    logger.warn("No valid price history data found after filtering.");
    return [];
  }

  // Determine candle period based on range
  let candlePeriod = 60; // Default: 1 minute
  switch (range) {
    case 5:
      candlePeriod = 300; // 5 mins
      break;
    case 15:
      candlePeriod = 900; // 15 mins
      break;
    case 60:
      candlePeriod = 3600; // 1 hour
      break;
    case 120:
      candlePeriod = 7200; // 2 hours
      break;
    default: 
    candlePeriod = 60;
  }

  // Align cdStart and cdEnd with the specified start and end range
  let cdStart = Math.floor(start / candlePeriod) * candlePeriod;
  let cdEnd = Math.floor(end / candlePeriod) * candlePeriod;

  // Convert price history to candle data
  let cdFeeds: CandlePrice[] = [];
  let pIndex = 0;
  for (let curCdStart = cdStart; curCdStart <= cdEnd; curCdStart += candlePeriod) {
    if (pIndex >= priceHistory.length) break;

    let st = priceHistory[pIndex].price;
    let hi = priceHistory[pIndex].price;
    let lo = priceHistory[pIndex].price;
    let en = priceHistory[pIndex].price;
    let prevIndex = pIndex;

    for (; pIndex < priceHistory.length;) {
      if (hi < priceHistory[pIndex].price) hi = priceHistory[pIndex].price;
      if (lo > priceHistory[pIndex].price) lo = priceHistory[pIndex].price;
      en = priceHistory[pIndex].price;

      if (priceHistory[pIndex].ts >= curCdStart + candlePeriod) break;
      pIndex++;
    }

    // Only add the candle if data was processed
    if (prevIndex !== pIndex) {
      cdFeeds.push({
        open: st,
        high: hi,
        low: lo,
        close: en,
        time: curCdStart,
      });
    }
  }

  return cdFeeds;
}
