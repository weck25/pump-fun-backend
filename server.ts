import { createServer } from 'http'
import app from './src/app'
import socketio from './src/sockets/'
import { logger } from './src/sockets/logger';
import { init } from './src/db/dbConncetion';


const startServer = async () => {
  await init()
  const server = createServer(app);
  socketio(server);

  server.listen(app.get('port'), () => {
    logger.info('  App is running at http://localhost:%d in %s mode', app.get('port'), app.get('env'));
  });
  server.on('close', (error: any) => {
    logger.error('Server closed unexpectedly by the reason: ', error);
  });
  
}
// Socket communication

/**
 * start Express server
 */
startServer()