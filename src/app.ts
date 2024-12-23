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

export  default app;