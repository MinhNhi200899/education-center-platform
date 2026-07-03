import 'dotenv/config';
import { app } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './shared/services/logger.service';
import { rbacService } from './modules/rbac/services/rbac.service';

const PORT = config.port;

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`, {
        nodeEnv: config.nodeEnv,
        port: PORT,
      });
    });

    // Ensure system roles have required permissions (fixes production RBAC drift)
    // Run after server starts so a slow DB sync can't block boot.
    Promise.resolve()
      .then(() => rbacService.syncSystemRolePermissions())
      .catch((syncError) => {
        logger.warn('RBAC sync on startup failed (server will still start)', { syncError });
      });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);

      server.close(async () => {
        logger.info('HTTP server closed');

        await disconnectDatabase();
        process.exit(0);
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();
