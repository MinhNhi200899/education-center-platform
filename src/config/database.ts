import { PrismaClient } from '@prisma/client';
import { logger } from '../shared/services/logger.service';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('query', (event) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Query executed', {
      sql: event.query,
      duration: event.duration,
      params: event.params,
    });
  }
});

prisma.$on('error', (event) => {
  logger.error('Prisma error', {
    message: event.message,
    target: event.target,
  });
});

prisma.$on('warn', (event) => {
  logger.warn('Prisma warning', {
    message: event.message,
    target: event.target,
  });
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Failed to disconnect from database', { error });
    throw error;
  }
}

export { prisma };
export default prisma;