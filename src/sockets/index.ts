import { Server, Socket } from 'socket.io';
import { logger } from './logger';
// import { connectRedis } from './redis';

let io: Server;

const socketio = async (server: any) => {
  try {
    // Socket communication
    io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Listen for new socket connections
    io.on('connection', async (socket: Socket) => {
      const id = (socket as any).user?.user?.id;
      console.log(`socket (${socket.id}) -> ${id}`);

      // Here you can add more socket events or other logic for the connection
      socket.on('transaction', (data) => {
        io.emit('transaction', data);
      })
    });

    // await connectRedis(io); // If you are using Redis, uncomment this

    logger.info('  Socket server is running');
  } catch (err) {
    logger.error('  Socket server run failed');
    console.error(err);
  }
};

export default socketio;

export const getIo = () => io;