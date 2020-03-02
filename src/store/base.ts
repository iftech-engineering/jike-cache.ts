import * as _ from 'lodash'

export interface CacheStat {
  call: number // 总调用数
  hit: number // 缓存命中次数
  percent?: number // 缓存命中率
}

export interface CacheStatSummary {
  all: CacheStat
  [k: string]: CacheStat
}

export type TTLConfig = number | (() => number)

export interface CacheConfig {
  ttl?: number
  isCacheableValue?(value: any): boolean
  prefix?: string
}

export abstract class BaseStore {
  private readonly cacheStats: CacheStatSummary = {
    all: {
      call: 0,
      hit: 0,
    },
  }

  public cacheConfig: CacheConfig = {}

  protected constructor(cacheConfig?: CacheConfig) {
    if (cacheConfig) {
      this.cacheConfig = cacheConfig
    }
  }

  /**
   * 获取统计值，因为get/set是手动的，所以只针对wrap方法有效
   */
  stats(): CacheStatSummary {
    _.forEach(this.cacheStats, value => {
      // eslint-disable-next-line no-param-reassign
      value.percent = _.round(value.call ? value.hit / value.call : 0, 2)
    })
    return this.cacheStats
  }

  async close(): Promise<void> {
    return Promise.resolve()
  }

  abstract get(key: string): Promise<any>

  abstract set(key: string, value: any, options?: unknown): Promise<void>

  abstract del(key: string): Promise<void>

  abstract wrap<T>(key: string, wrapper: () => Promise<T>, options?: unknown): Promise<T>

  protected needCache(value: any): boolean {
    if (this.cacheConfig.isCacheableValue) {
      return this.cacheConfig.isCacheableValue(value)
    }
    return true
  }

  protected incInit(key = 'all') {
    if (!this.cacheStats[key]) {
      this.cacheStats[key] = {
        call: 0,
        hit: 0,
      }
    }
    this.cacheStats[key].call += 1
  }

  protected incHit(key = 'all') {
    if (!this.cacheStats[key]) {
      // impossible
      return
    }
    this.cacheStats[key].hit += 1
  }
}
