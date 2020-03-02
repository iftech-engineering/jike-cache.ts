import * as _ from 'lodash'
import * as memoizee from 'memoizee'
import { RedisCacheStore, RedisOption } from './store/redis'
import { TTLConfig, CacheConfig } from './store/base'
import { MemoryCacheStore, MemoryOption } from './store/memory'

export class Cache {
  public store: RedisCacheStore | MemoryCacheStore

  constructor(memoryStore: 'memory', memoryStoreConfig: MemoryOption, cacheConfig?: CacheConfig)

  constructor(redisStore: 'redis', redisStoreConfig: RedisOption, cacheConfig?: CacheConfig)

  constructor(
    storeName: 'memory' | 'redis',
    storeConfig: MemoryOption | RedisOption,
    cacheConfig?: CacheConfig,
  ) {
    if (storeName === 'memory') {
      this.store = new MemoryCacheStore(storeConfig as MemoryOption, cacheConfig)
    } else if (storeName === 'redis') {
      this.store = new RedisCacheStore(storeConfig as RedisOption, cacheConfig)
    } else {
      throw new Error('Store Name invalid. Only memory or redis')
    }
  }

  async get(key: string) {
    return this.store.get(key)
  }

  async set(key: string, value: any, options?: { ttl: TTLConfig }) {
    return this.store.set(key, value, options)
  }

  async del(key: string) {
    return this.store.del(key)
  }

  /**
   * wrap async function, save result into store
   * @param key
   * @param wrapper
   * @param options
   */
  async wrap<T>(key: string, wrapper: () => Promise<T>, options: { ttl: TTLConfig }): Promise<T> {
    return this.store.wrap(key, wrapper, options)
  }

  async close() {
    return this.store.close()
  }

  /**
   * memoizee function
   * @param f
   * @param options
   */
  static memo<F extends Function>(
    f: F,
    options?: memoizee.Options & { ttl?: number },
  ): F & memoizee.Memoized<F> {
    const opt = options || {}
    if (opt.promise === undefined) {
      opt.promise = true // default is async mode
    }
    if (opt.ttl) {
      opt.maxAge = opt.ttl * 1000
    }
    return memoizee(f, options)
  }

  /**
   * memoizee function then with cache wrap
   * @param f
   * @param key
   * @param cache
   * @param options
   */
  static memoWithCache<T, ARG extends any[], F extends (...args: ARG) => Promise<T>>(
    f: F,
    key: string | ((...args: ARG) => string),
    cache: Cache,
    options: {
      memo?: memoizee.Options & { ttl?: number }
      wrap: { ttl: number }
    },
  ) {
    function wrapped(...args: ARG): Promise<T> {
      let cacheKey: string
      if (_.isString(key)) {
        cacheKey = key
      } else if (_.isFunction(key)) {
        cacheKey = key(...args)
      } else {
        throw new Error('Key must string or function return string')
      }
      return cache.wrap(cacheKey, () => f(...args), { ttl: options.wrap.ttl })
    }
    return memoizee(wrapped, options.memo)
  }
}
