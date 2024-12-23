"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config.js");
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const user_1 = __importDefault(require("./routes/user"));
const coin_1 = __importDefault(require("./routes/coin"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const coinTrade_1 = __importDefault(require("./routes/coinTrade"));
const chart_1 = __importDefault(require("./routes/chart"));
const follow_1 = __importDefault(require("./routes/follow"));
const sockets_1 = __importDefault(require("./sockets/"));
const logger_1 = require("./sockets/logger");
const dbConncetion_1 = require("./db/dbConncetion");
const http_1 = require("http");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)({
    origin: '*'
}));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.set('port', PORT);
app.use('/api/user/', user_1.default);
app.use('/api/coin/', coin_1.default);
app.use('/api/feedback/', feedback_1.default);
app.use('/api/cointrade/', coinTrade_1.default);
app.use('/api/chart/', chart_1.default);
app.use('/api/follow/', follow_1.default);
const startServer = async () => {
    try {
        // Initialize the database
        await (0, dbConncetion_1.init)();
        const server = (0, http_1.createServer)(app);
        (0, sockets_1.default)(server);
        server.listen(PORT, () => {
            logger_1.logger.info('App is running at http://localhost:%d in %s mode', PORT, app.get('env'));
        });
        server.on('close', (error) => {
            logger_1.logger.error('Server closed unexpectedly by the reason: ', error);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start the server: ', error);
        process.exit(1); // Exit the process with an error code
    }
};
startServer();
