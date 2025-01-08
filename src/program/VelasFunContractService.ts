import { LogsOutput, Web3, WebSocketProvider } from 'web3';
import { Contract } from './Web3Service';
import VelasFunABI from '../abi/VelasFunABI.json';
import { events } from '../utils/events';
import Coin from '../models/Coin';
import AdminData from '../models/AdminData';
import CoinStatus from '../models/CoinsStatus';
import User from '../models/User';
import { getIo } from "../sockets";
import { setCoinStatus } from '../routes/coinStatus';

const VelasFunContract: Contract = {
    address: process.env.VELAS_CONTRACT_ADDRESS || '',
    abi: VelasFunABI
}

const PINATA_GATEWAY_URL = process.env.PINATA_GATEWAY_URL;

const web3 = new Web3(new WebSocketProvider(process.env.WSS_BASE_PROVIDER_URL || ''));

export interface ResultType {
    tx: string,
    mint: string;
    owner: string;
    swapType: number;
    swapAmount: string;
    reserve1: string;
    reserve2: string;
    price: string;
}

function encodeEvent(event: string) {
    const keccakHash = web3.utils.keccak256(event);
    return keccakHash;
}

events.forEach(event => {
    event.signatureHash = encodeEvent(event.signature);
})

const logsFilter = {
    address: VelasFunContract.address,
}

export async function subscribeToLogs() {
    try {
        const subscription = await web3.eth.subscribe("logs", logsFilter);
        console.log(`Subscription Id: ${subscription.id}`)
        subscription.on("data", handleLogs);
        subscription.on("error", handleError);
    } catch (error) {
        console.log(error)
    }
}

function handleLogs(log: LogsOutput) {
    const matchedEvent = events.find(event => event.signatureHash === log.topics[0]);
    if (matchedEvent) {
        try {
            const decodedLog = web3.eth.abi.decodeLog(
                matchedEvent.abi.inputs,
                log.data,
                log.topics.slice(1)
            );

            console.log(`Decoded ${matchedEvent.name} log:`, decodedLog);

            switch (matchedEvent.name) {
                case "TokenCreated":
                    handleTokenCreatedEvent(decodedLog, log.transactionHash as string);
                    break;
                case "TokenPurchased":
                    handleTokenBuySellEvent(
                        log.transactionHash as string,
                        decodedLog.buyer as string,
                        decodedLog.tokenAddress as string,
                        2,
                        decodedLog.amount as string,
                        decodedLog.reserve0 as string,
                        decodedLog.reserve1 as string,
                        decodedLog.price as string
                    );
                    break;
                case "TokenSold":
                    handleTokenBuySellEvent(
                        log.transactionHash as string,
                        decodedLog.seller as string,
                        decodedLog.tokenAddress as string,
                        1,
                        decodedLog.tokensSold as string,
                        decodedLog.reserve0 as string,
                        decodedLog.reserve1 as string,
                        decodedLog.price as string
                    );
                    break;
                case "GraduatingTokenToUniswap":
                    handleGraduatingEvent(decodedLog.tokenAddress as string);
                    break;
                case "TradingEnabledOnUniswap":
                    handleTradingEnabledOnUniswap(decodedLog.tokenAddress as string, decodedLog.uniswapPair as string);
                    break;
            }
        } catch (error) {
            console.error(`Error decoding ${matchedEvent.name} log:`, error);
        }
    } else {
        console.warn("Unknown event received: ", log);
    }
}

function handleError(error: Error) {
    console.error("Subscription error: ", error);
}

async function handleTokenCreatedEvent(decodedLog: any, txHash: string) {
    try {
        const io = getIo()
        const {
            tokenAddress,
            creator,
            name,
            symbol,
            description,
            image,
            twitter,
            telegram,
            website,
            amount,
            price,
            reserve0,
            reserve1
        } = decodedLog

        const oldCoin = await Coin.findOne({ token: tokenAddress });

        if (oldCoin) return;

        const urlSeg = image.split('/');
        const url = `${PINATA_GATEWAY_URL}/${urlSeg[urlSeg.length - 1]}`;

        const user = await User.findOne({ wallet: creator });
        if (!user) return;

        const newCoin = new Coin({
            creator: user._id,
            name: name,
            ticker: symbol,
            description: description,
            token: tokenAddress,
            twitter: twitter,
            telegram: telegram,
            website: website,
            url,
            reserveOne: Number(reserve0),
            reserveTwo: Number(reserve1)
        });
        const _newCoin = await newCoin.save();

        const adminData = await AdminData.findOne();

        const record = [
            {
                holder: _newCoin.creator,
                holdingStatus: 2,
                amount: 0,
                tx: txHash,
                price: Math.floor(1.8 * 1_000_000_000_000 / 1_087_598_453) / 1_000_000_000_000,
                feePercent: adminData?.feePercent
            },
        ]

        if (BigInt(amount) !== 0n) record.push({
            holder: _newCoin.creator,
            holdingStatus: 2,
            amount: Number(amount) / 1_000_000_000_000_000_000,
            tx: txHash,
            price: Number(price) / 1_000_000_000_000,
            feePercent: adminData?.feePercent
        })

        const newCoinStatus = new CoinStatus({
            coinId: _newCoin._id,
            record: record
        })
        await newCoinStatus.save();
        io.emit('TokenCreated', { coin: _newCoin, user });
    } catch (error) {
        console.error("Error is occurred while token created: ", error)
    }
}

async function handleTokenBuySellEvent(
    tx: string,
    owner: string,
    mint: string,
    swapType: number,
    swapAmount: string,
    reserve1: string,
    reserve2: string,
    price: string,
) {
    try {
        const data: ResultType = {
            tx,
            owner,
            mint,
            swapType,
            swapAmount,
            reserve1,
            reserve2,
            price
        }

        await setCoinStatus(data);
    } catch (error) {
        console.error("Error is occurred while token buying and selling: ", error)
    }
}

async function handleGraduatingEvent(tokenAddress: string) {
    try {
        const io = getIo();
        const coin = await Coin.findOne({ token: tokenAddress });
        if (!coin) {
            console.error("Graduating token not found");
            return;
        }
        coin.tradingPaused = true;
        await coin.save();
        io.emit('graduating-to-dex', coin);
    } catch (error) {
        console.error("Error is occurred while graduating token: ", error);
    }
}

async function handleTradingEnabledOnUniswap(tokenAddress: string, uniswapPair: string) {
    try {
        const io = getIo();
        const coin = await Coin.findOne({ token: tokenAddress });
        if (!coin) {
            console.error("Graduating token not found");
            return;
        }
        coin.tradingOnUniswap = true;
        coin.tradingPaused = false;
        coin.uniswapPair = uniswapPair;
        await coin.save();
        io.emit('trading-enabled-on-uniswap', coin);
    } catch (error) {
        console.error("Error is occurred while enable to trade on uniswap: ", error);
    }
}