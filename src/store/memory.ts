import * as _ from 'lodash'
import * as QuickLru from 'quick-lru'
import { BaseStore, CacheConfig, TTLConfig } from './base'

interface Item {
  expireAt: number
  value: any
}

export interface MemoryOption {
  max: number
}

export class MemoryCacheStore extends BaseStore {
  private readonly lru: QuickLru<string, Item>

  private readonly ttl: number = 0

  constructor(storeConfig: MemoryOption, cacheConfig?: CacheConfig) {
    super(cacheConfig)
    if (storeConfig && storeConfig.max) {
      this.lru = new QuickLru({ maxSize: storeConfig.max })
    } else {
      throw new Error('store config `max` is required')
    }
    if (cacheConfig && cacheConfig.ttl) {
      this.ttl = cacheConfig.ttl
    }
  }

  del(key: string): Promise<void> {
    this.lru.delete(key)
    return Promise.resolve()
  }

  private _get(key: string): any {
    const r = this.lru.get(key)
    if (r) {
      const expired = this.isExpired(r)
      if (!expired) {
        return r.value
      }
      // based on our usage, only delete it when get
      this.lru.delete(key)
    }
    return null
  }

  get(key: string): Promise<any> {
    const v = this._get(key)
    return Promise.resolve(v)
  }

  private _set(key: string, value: any, options?: { ttl: TTLConfig }): void {
    let { ttl } = this
    if (options) {
      if (_.isFunction(options.ttl)) {
        ttl = options.ttl()
      } else if (_.isFinite(options.ttl) && options.ttl >= 0) {
        ttl = options.ttl
      } else {
        throw new Error('TTL Setting is Invalid')
      }
    }
    const expireAt = ttl ? Date.now() + ttl * 1000 : 0
    this.lru.set(key, { expireAt, value })
  }

  set(key: string, value: any, options?: { ttl: TTLConfig }): Promise<void> {
    this._set(key, value, options)
    return Promise.resolve()
  }

  wrap<T>(key: string, wrapper: () => Promise<T>, options: { ttl: TTLConfig }): Promise<T> {
    this.incInit()
    const v = this._get(key)
    if (v) {
      this.incHit()
      return Promise.resolve(v)
    }
    return wrapper().then(res => {
      if (this.needCache(res)) {
        this._set(key, res, options)
      }
      return res
    })
  }

  async close() {
    this.lru.clear()
  }

  private isExpired(v: Item): boolean {
    if (!v.expireAt) {
      return false
    }
    return Date.now() >= v.expireAt
  }
}
