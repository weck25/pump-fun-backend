import express from 'express';
import 'dotenv/config.js';
import bodyParser from 'body-parser'
import cors from 'cors'
import userRoutes from './routes/user'
import coinRoutes from './routes/coin'
import messageRoutes from './routes/feedback'
import coinTradeRoutes from './routes/coinTrade'
import chartRoutes from './routes/chart'
import followRoutes from './routes/follow';
import socketio from './sockets/';
import { logger } from './sockets/logger';
import { init } from './db/dbConncetion';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*'
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('port', PORT)

app.use('/api/user/', userRoutes);
app.use('/api/coin/', coinRoutes);
app.use('/api/feedback/', messageRoutes);
app.use('/api/cointrade/', coinTradeRoutes)
app.use('/api/chart/', chartRoutes)
app.use('/api/follow/', followRoutes);

const startServer = async () => {
  try {
    // Initialize the database
    await init();

    const server = createServer(app);
    socketio(server);

    server.listen(PORT, () => {
      logger.info('App is running at http://localhost:%d in %s mode', PORT, app.get('env'));
    });

    server.on('close', (error: any) => {
      logger.error('Server closed unexpectedly by the reason: ', error);
    });
  } catch (error) {
    logger.error('Failed to start the server: ', error);
    process.exit(1); // Exit the process with an error code
  }
};

startServer();