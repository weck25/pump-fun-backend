export interface Event {
    name: string;
    signature: string;
    abi: {
        anonymous: false;
        inputs: {
            indexed?: boolean;
            internalType?: string;
            name: string;
            type: string;
        }[];
        name: string;
        type: string;
    };
    signatureHash?: string;
}

export const events: Event[] = [
    {
        name: "TokenCreated",
        signature: "TokenCreated(address,address,string,string,string,string,string,string,string,uint256,uint256,uint256,uint256)",
        abi: {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "tokenAddress",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "creator",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "symbol",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "description",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "image",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "twitter",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "telegram",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "website",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "price",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "reserve0",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "reserve1",
                    "type": "uint256"
                }
            ],
            "name": "TokenCreated",
            "type": "event"
        },
    },
    {
        name: "TokenPurchased",
        signature: "TokenPurchased(address,address,uint256,uint256,uint256,uint256)",
        abi: {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "buyer",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "tokenAddress",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "price",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "reserve0",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "reserve1",
                    "type": "uint256"
                }
            ],
            "name": "TokenPurchased",
            "type": "event"
        }
    },
    {
        name: "TokenSold",
        signature: "TokenSold(address,address,uint256,uint256,uint256,uint256)",
        abi: {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "seller",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "tokenAddress",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "tokensSold",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "price",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "reserve0",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "reserve1",
                    "type": "uint256"
                }
            ],
            "name": "TokenSold",
            "type": "event"
        },
    },
    {
        name: "GraduatingTokenToUniswap",
        signature: "GraduatingTokenToUniswap(address)",
        abi: {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: "address",
                    name: "tokenAddress",
                    type: "address"
                }
            ],
            name: "GraduatingTokenToUniswap",
            type: "event"
        }
    },
    {
        name: "TradingEnabledOnUniswap",
        signature: "TradingEnabledOnUniswap(address,address)",
        abi: {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: "address",
                    name: "tokenAddress",
                    type: "address"
                },
                {
                    indexed: true,
                    internalType: "address",
                    name: "uniswapPair",
                    type: "address"
                }
            ],
            name: "TradingEnabledOnUniswap",
            type: "event"
        }
    },
    {
        name: "VariablesUpdated",
        signature: "VariablesUpdated(bool,address[],uint256,uint256,uint256,uint256,address,uint256)",
        abi: {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "bool",
                    "name": "paused",
                    "type": "bool"
                },
                {
                    "indexed": false,
                    "internalType": "address[]",
                    "name": "admin",
                    "type": "address[]"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "creationFee",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "feePercent",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "creatorReward",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "baseFunReward",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "feeAddress",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "graduationMarketCap",
                    "type": "uint256"
                }
            ],
            "name": "VariablesUpdated",
            "type": "event"
        }
    }
]