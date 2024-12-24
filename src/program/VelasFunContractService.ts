import { HttpProvider, Web3 } from 'web3';
import { Contract } from './Web3Service';
import VelasFunABI from '../abi/VelasFunABI.json';

const VelasFunContract: Contract = {
    address: process.env.VELAS_CONTRACT_ADDRESS || '',
    abi: VelasFunABI
}

const providerUrl = process.env.VELAS_PROVIDER_URL || 'https://evmexplorer.velas.com/rpc';

const web3 = new Web3(
    new HttpProvider(providerUrl)
);
const contract = new web3.eth.Contract(VelasFunContract.abi, VelasFunContract.address);;

export interface CreateTokenTxResult {
    creator: string;
    tokenAddress: string;
    amount: string;
    price: string;
    reserve0: string;
    reserve1: string;
}

export interface BuyTokenTxResult {
    buyer: string;
    tokenAddress: string;
    amount: string;
    price: string;
    reserve0: string;
    reserve1: string;
}

export interface SellTokenTxResult {
    seller: string;
    tokenAddress: string;
    tokenSold: string;
    price: string;
    reserve0: string;
    reserve1: string;
}

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

export const pollCreateEventFromVelas = async (txHash: string) => {
    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt && receipt.logs) {
            for (const log of receipt.logs) {
                if (log.topics && log.topics[0] === web3.utils.sha3('TokenCreated(address,address,string,string,uint256,uint256,uint256,uint256)')) {
                    const decoded = web3.eth.abi.decodeLog(
                        [
                            { type: 'address', name: 'tokenAddress', indexed: true },
                            { type: 'address', name: 'creator', indexed: true },
                            { type: 'string', name: 'name' },
                            { type: 'string', name: 'symbol' },
                            { type: 'uint256', name: 'amount' },
                            { type: 'uint256', name: 'price' },
                            { type: 'uint256', name: 'reserve0' },
                            { type: 'uint256', name: 'reserve1' },
                        ],
                        log.data ?? '',
                        log.topics.slice(1)
                    );
                    const txResult: CreateTokenTxResult = { creator: decoded.creator as string, tokenAddress: decoded.tokenAddress as string, amount: decoded.amount as string, price: decoded.price as string, reserve0: decoded.reserve0 as string, reserve1: decoded.reserve1 as string }
                    return { success: true, txResult };
                }
            }
        }
        return { success: false, txResult: null }
    } catch (error) {
        console.log(error);
        return { success: false, txResult: null }
    }
}

export const pollBuyTokenEventFromVelas = async (txHash: string) => {
    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt && receipt.logs) {
            for (const log of receipt.logs) {
                if (log.topics && log.topics[0] === web3.utils.sha3('TokenPurchased(address,address,uint256,uint256,uint256,uint256)')) {
                    console.log('receipt')
                    const decoded = web3.eth.abi.decodeLog(
                        [
                            { type: 'address', name: 'buyer', indexed: true },
                            { type: 'address', name: 'tokenAddress', indexed: true },
                            { type: 'uint256', name: 'solAmount' },
                            { type: 'uint256', name: 'price' },
                            { type: 'uint256', name: 'reserve0' },
                            { type: 'uint256', name: 'reserve1' },
                        ],
                        log.data ?? '',
                        log.topics.slice(1)
                    );
                    const txResult: BuyTokenTxResult = {
                        buyer: decoded.buyer as string,
                        tokenAddress: decoded.tokenAddress as string,
                        amount: decoded.solAmount as string,
                        price: decoded.price as string,
                        reserve0: decoded.reserve0 as string,
                        reserve1: decoded.reserve1 as string,
                    }
                    return { success: true, txResult };
                }
            }
        }
        return { success: false, txResult: null };
    } catch (error) {
        console.log(error);
        return { success: false, txResult: null };
    }
}

export const pollSellTokenEventFromVelas = async (txHash: string) => {
    try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt && receipt.logs) {
            for (const log of receipt.logs) {
                if (log.topics && log.topics[0] === web3.utils.sha3('TokenSold(address,address,uint256,uint256,uint256,uint256)')) {
                    const decoded = web3.eth.abi.decodeLog(
                        [
                            { type: 'address', name: 'seller', indexed: true },
                            { type: 'address', name: 'tokenAddress', indexed: true },
                            { type: 'uint256', name: 'tokensSold' },
                            { type: 'uint256', name: 'price' },
                            { type: 'uint256', name: 'reserve0' },
                            { type: 'uint256', name: 'reserve1' },
                        ],
                        log.data ?? '',
                        log.topics.slice(1)
                    );
                    const txResult: SellTokenTxResult = {
                        seller: decoded.seller as string,
                        tokenAddress: decoded.tokenAddress as string,
                        tokenSold: decoded.tokensSold as string,
                        price: decoded.price as string,
                        reserve0: decoded.reserve0 as string,
                        reserve1: decoded.reserve1 as string,
                    }
                    return { success: true, txResult };
                }
            }
        }
        return { success: false, txResult: null };
    } catch (error) {
        console.log(error);
        return { success: false, txResult: null };
    }
}