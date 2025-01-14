import express from 'express';
import 'dotenv/config.js';
import bodyParser from 'body-parser';
import cors from 'cors';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';
import coinRoutes from './routes/coin';
import messageRoutes from './routes/feedback';
import coinTradeRoutes from './routes/coinTrade';
import chartRoutes from './routes/chart';
import followRoutes from './routes/follow';
import socketio from './sockets/';
import { logger } from './sockets/logger';
import { init } from './db/dbConnection';
import { createServer } from 'http';
import path from 'path';
import { subscribeToLogs } from './program/VelasFunContractService';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors())

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('port', PORT)

app.use('/api/admin/', adminRoutes);
app.use('/api/user/', userRoutes);
app.use('/api/coin/', coinRoutes);
app.use('/api/feedback/', messageRoutes);
app.use('/api/cointrade/', coinTradeRoutes)
app.use('/api/chart/', chartRoutes)
app.use('/api/follow/', followRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const startServer = async () => {
  try {
    await init();
    const server = createServer(app);
    socketio(server);
    await subscribeToLogs()

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