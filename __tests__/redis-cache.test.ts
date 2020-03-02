import * as _ from 'lodash'
import * as Redis from 'ioredis'
import { Cache } from '../src'
import { testFunc, testValue } from './helpers'

const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379
const redisHost = process.env.REDIS_HOST || '127.0.0.1'

describe('#RedisCache', () => {
  const cache = new Cache('redis', `${redisHost}:${redisPort}`)
  const redisClient = new Redis(`${redisHost}:${redisPort}`)
  const testKey = 'test-key'
  const testWrap = 'test-wrap-key'
  const testWrapTTL = 'test-wrap-ttl'
  const testWrapPrefix = 'test-wrap-ttl-prefix'

  afterAll(async () => {
    await redisClient
      .pipeline()
      .del(testKey)
      .del(testWrap)
      .del(testWrapTTL)
      .del(`jike:${testWrapPrefix}`)
      .exec()
    await redisClient.disconnect()
    await cache.close()
  })

  it('should get nothing', async () => {
    const r = await cache.get('nothing')
    return expect(r).toBeNull()
  })

  it('should set cache', async () => {
    await cache.set(testKey, testValue)
    expect(await redisClient.get(testKey)).toBe(JSON.stringify(testValue))
    expect(await redisClient.ttl(testKey)).toBe(-1)
  })

  it('should get cache', async () => {
    return expect(await cache.get(testKey)).toEqual(testValue)
  })

  it('should del cache', async () => {
    await cache.del(testKey)
    expect(await redisClient.get(testKey)).toBeNull()
    await cache.set(testKey, testValue)
  })

  it('should wrap function', async () => {
    const res = await cache.wrap(testWrap, () => testFunc(), { ttl: 0 })
    expect(res).toEqual(testValue)
    expect(await redisClient.get(testWrap)).toBe(JSON.stringify(testValue))
    expect(cache.store.stats()).toEqual({
      all: {
        call: 1,
        hit: 0,
        percent: 0,
      },
    })
  })

  it('should hit cache', async () => {
    const res = await cache.wrap(testWrap, () => testFunc(), { ttl: 0 })
    expect(res).toEqual(testValue)
    expect(cache.store.stats()).toEqual({
      all: {
        call: 2,
        hit: 1,
        percent: 0.5,
      },
    })
  })

  it('should reuse promise when parallel fetch', async () => {
    const resArray = await Promise.all(_.times(5, () => cache.wrap(testWrap, testFunc, { ttl: 0 })))
    for (const res of resArray) {
      expect(res).toEqual(testValue)
    }
  })

  it('should create redis cache store', async () => {
    const caches = [
      new Cache('redis', redisClient),
      new Cache('redis', { host: redisHost, port: redisPort }),
      new Cache('redis', `redis://${redisHost}:${redisPort}/0`),
    ]
    for (const c of caches) {
      expect(await c.get(testKey)).toEqual(testValue)
    }
  })

  it('should set ttl', async () => {
    const res = await cache.wrap(testWrapTTL, () => testFunc(), {
      ttl: 10,
    })
    expect(res).toEqual(testValue)
    expect(await redisClient.ttl(testWrapTTL)).toBeGreaterThan(1)
  })

  it('should set ttl and prefix when create cache', async () => {
    const c = new Cache('redis', redisClient, {
      ttl: 10,
      prefix: 'jike:',
    })
    await c.set(testWrapPrefix, testValue)
    expect(await redisClient.get(`jike:${testWrapPrefix}`)).toBe(JSON.stringify(testValue))
    expect(await redisClient.ttl(`jike:${testWrapPrefix}`)).toBeGreaterThan(1)
  })

  it('should throw error when wrapped function failed', async () => {
    try {
      await cache.wrap('should-failed', () => testFunc(true), { ttl: 0 })
      expect('Should not happened').toBe(2)
    } catch (e) {
      expect(e.message).toBe('For test')
    }
    expect(await redisClient.exists('should-failed')).toBe(0)
  })
})
