"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIo = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = require("./logger");
// import { connectRedis } from './redis';
let io;
const socketio = async (server) => {
    try {
        // Socket communication
        io = new socket_io_1.Server(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        });
        // Listen for new socket connections
        io.on('connection', async (socket) => {
            const id = socket.user?.user?.id;
            console.log(`socket (${socket.id}) -> ${id}`);
            // Here you can add more socket events or other logic for the connection
            socket.on('transaction', (data) => {
                io.emit('transaction', data);
            });
        });
        // await connectRedis(io); // If you are using Redis, uncomment this
        logger_1.logger.info('  Socket server is running');
    }
    catch (err) {
        logger_1.logger.error('  Socket server run failed');
        console.error(err);
    }
};
exports.default = socketio;
const getIo = () => io;
exports.getIo = getIo;
