import * as redis from 'redis';
import * as bluebird from 'bluebird';
import logger from '../utils/logger';

bluebird.promisifyAll(redis.RedisClient.prototype);

const redisClient: redis.RedisClient = redis.createClient({
    host: 'localhost',
    port: 6379
});

redisClient.on('connect', () => {
    logger.info('Redis connected');
})

redisClient.on('error', (err) => {
    logger.info('Redis eror: ', err);
})

export default redisClient;