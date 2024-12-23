"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollSellTokenEventFromVelas = exports.pollBuyTokenEventFromVelas = exports.pollCreateEventFromVelas = void 0;
const web3_1 = require("web3");
const VelasFunABI_json_1 = __importDefault(require("../abi/VelasFunABI.json"));
const VelasFunContract = {
    address: process.env.VELAS_CONTRACT_ADDRESS || '',
    abi: VelasFunABI_json_1.default
};
const providerUrl = process.env.VELAS_PROVIDER_URL || 'https://evmexplorer.velas.com/rpc';
const web3 = new web3_1.Web3(new web3_1.HttpProvider(providerUrl));
const contract = new web3.eth.Contract(VelasFunContract.abi, VelasFunContract.address);
;
const pollCreateEventFromVelas = async (txHash) => {
    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt && receipt.logs) {
            for (const log of receipt.logs) {
                if (log.topics && log.topics[0] === web3.utils.sha3('TokenCreated(address,address,string,string)')) {
                    const decoded = web3.eth.abi.decodeLog([
                        { type: 'address', name: 'tokenAddress', indexed: true },
                        { type: 'address', name: 'creator', indexed: true },
                        { type: 'string', name: 'name' },
                        { type: 'string', name: 'symbol' },
                    ], log.data ?? '', log.topics.slice(1));
                    const txResult = { creator: decoded.creator, tokenAddress: decoded.tokenAddress };
                    return { success: true, txResult };
                }
            }
        }
        return { success: false, txResult: null };
    }
    catch (error) {
        console.log(error);
        return { success: false, txResult: null };
    }
};
exports.pollCreateEventFromVelas = pollCreateEventFromVelas;
const pollBuyTokenEventFromVelas = async (txHash) => {
    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt && receipt.logs) {
            for (const log of receipt.logs) {
                if (log.topics && log.topics[0] === web3.utils.sha3('TokenPurchased(address,address,uint256,uint256,uint256,uint256)')) {
                    console.log('receipt');
                    const decoded = web3.eth.abi.decodeLog([
                        { type: 'address', name: 'buyer', indexed: true },
                        { type: 'address', name: 'tokenAddress', indexed: true },
                        { type: 'uint256', name: 'solAmount' },
                        { type: 'uint256', name: 'price' },
                        { type: 'uint256', name: 'reserve0' },
                        { type: 'uint256', name: 'reserve1' },
                    ], log.data ?? '', log.topics.slice(1));
                    const txResult = {
                        buyer: decoded.buyer,
                        tokenAddress: decoded.tokenAddress,
                        amount: decoded.solAmount,
                        price: decoded.price,
                        reserve0: decoded.reserve0,
                        reserve1: decoded.reserve1,
                    };
                    return { success: true, txResult };
                }
            }
        }
        return { success: false, txResult: null };
    }
    catch (error) {
        console.log(error);
        return { success: false, txResult: null };
    }
};
exports.pollBuyTokenEventFromVelas = pollBuyTokenEventFromVelas;
const pollSellTokenEventFromVelas = async (txHash) => {
    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt && receipt.logs) {
            for (const log of receipt.logs) {
                if (log.topics && log.topics[0] === web3.utils.sha3('TokenSold(address,address,uint256,uint256,uint256,uint256)')) {
                    const decoded = web3.eth.abi.decodeLog([
                        { type: 'address', name: 'seller', indexed: true },
                        { type: 'address', name: 'tokenAddress', indexed: true },
                        { type: 'uint256', name: 'tokensSold' },
                        { type: 'uint256', name: 'price' },
                        { type: 'uint256', name: 'reserve0' },
                        { type: 'uint256', name: 'reserve1' },
                    ], log.data ?? '', log.topics.slice(1));
                    const txResult = {
                        seller: decoded.seller,
                        tokenAddress: decoded.tokenAddress,
                        tokenSold: decoded.tokensSold,
                        price: decoded.price,
                        reserve0: decoded.reserve0,
                        reserve1: decoded.reserve1,
                    };
                    return { success: true, txResult };
                }
            }
        }
        return { success: false, txResult: null };
    }
    catch (error) {
        console.log(error);
        return { success: false, txResult: null };
    }
};
exports.pollSellTokenEventFromVelas = pollSellTokenEventFromVelas;
