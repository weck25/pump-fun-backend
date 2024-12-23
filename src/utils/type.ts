import { Types } from "mongoose";

export interface priceFeedInfo {
    price: number,
    time: Date,
}
export type CandlePrice = {
  open: number;
  high: number;
  low: number;
  close: number;
  time: number;
};

export interface CoinInfo {
    creator?: Types.ObjectId;
    name: string;
    ticker: string;
    url: string;
    description?: string;
    token?: string;
    reserve1?: number;
    reserve2?: number;
    telegram?: string;
    website?: string;
    twitter?: string;
}