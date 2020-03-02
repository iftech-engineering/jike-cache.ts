import * as _ from 'lodash'
import * as Redis from 'ioredis'
// tslint:disable-next-line:no-duplicate-imports
import { Redis as RedisClient, RedisOptions } from 'ioredis'

import { BaseStore, CacheConfig, TTLConfig } from './base'

export type RedisOption = RedisClient | string | RedisOptions

export class RedisCacheStore extends BaseStore {
  private readonly redisClient: RedisClient

  private readonly ttl: number = 0 // TTL为零则不设置

  private readonly prefix: string = ''

  private readonly fetchQueue: Map<string, Promise<any>> = new Map()

  constructor(options: RedisOption, cacheConfig?: CacheConfig) {
    super(cacheConfig)
    if (options instanceof Redis) {
      this.redisClient = options
    } else if (_.isString(options)) {
      this.redisClient = new Redis(options)
    } else if (_.isObject(options)) {
      this.redisClient = new Redis(options)
    } else {
      throw new Error('redisClient or urlOrOptions is required')
    }
    if (cacheConfig) {
      this.cacheConfig = cacheConfig
    }
    this.ttl = this.cacheConfig.ttl || 0
    this.prefix = this.cacheConfig.prefix || ''
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key)
  }

  async get(key: string): Promise<any> {
    const v = await this.redisClient.get(key)
    if (v) {
      return JSON.parse(v)
    }
    return v
  }

  async set(key: string, value: any, options?: { ttl: TTLConfig }): Promise<void> {
    const k = this.prefix ? this.prefix + key : key
    const v = JSON.stringify(value)
    let { ttl } = this
    // 有可能store的ttl是10s，但是options的ttl是0（也就是针对这个key，不进行ttl）
    if (options) {
      if (_.isFunction(options.ttl)) {
        ttl = options.ttl()
      } else if (_.isFinite(options.ttl) && options.ttl >= 0) {
        ttl = options.ttl
      } else {
        throw new Error('TTL Setting is Invalid')
      }
    }
    if (ttl > 0) {
      await this.redisClient.setex(k, ttl, v)
    } else {
      await this.redisClient.set(k, v)
    }
  }

  async wrap<T>(key: string, wrapper: () => Promise<T>, options: { ttl: TTLConfig }): Promise<T> {
    // do not stats every key
    this.incInit()
    if (this.fetchQueue.has(key)) {
      this.incHit()
      return this.fetchQueue.get(key) as Promise<T>
    }
    const promise = Promise.resolve().then(async () => {
      const cachedValue = await this.get(key)
      if (cachedValue) {
        this.incHit()
        return cachedValue
      }
      // only cache resolved value exclude reject
      const willCacheValue = await wrapper()
      if (this.needCache(willCacheValue)) {
        await this.set(key, willCacheValue, options)
      }
      return willCacheValue
    })
    this.fetchQueue.set(key, promise)
    const res = await promise
    this.fetchQueue.delete(key)
    return res
  }

  async close() {
    this.redisClient.disconnect()
    return Promise.resolve()
  }
}
