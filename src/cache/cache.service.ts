import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private redis = new Redis();

  async get(key: string) {
    return this.redis.get(key);
  }

  async set(key: string, value: any, ttl = 60) {
    return this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async del(key: string) {
    return this.redis.del(key);
  }
}
