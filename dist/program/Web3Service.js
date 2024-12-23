"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Service = void 0;
const web3_1 = __importDefault(require("web3"));
const providerUrl = process.env.VELAS_PROVIDER_URL || 'wss://evmexplorer.velas.com/rpc';
class Web3Service {
    static instance = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    web3;
    constructor() {
        this.web3 = new web3_1.default(providerUrl);
    }
    static getInstance() {
        if (!Web3Service.instance) {
            Web3Service.instance = new Web3Service();
        }
        return Web3Service.instance;
    }
    getContractInterface(contract) {
        return new this.web3.eth.Contract(contract.abi, contract.address);
    }
}
exports.Web3Service = Web3Service;
