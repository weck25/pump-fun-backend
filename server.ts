import { createServer } from 'http';
import app from './src/app';
import socketio from './src/sockets/';
import { logger } from './src/sockets/logger';
import { init } from './src/db/dbConncetion';

const PORT = process.env.PORT || 5000;

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
