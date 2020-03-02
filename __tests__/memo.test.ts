import * as Redis from 'ioredis'
import { Cache } from '../src'

const redisPort = process.env.REDIS_PORT || 6379
const redisHost = process.env.REDIS_HOST || '127.0.0.1'

describe('#Memo', () => {
  function testFunction(i: number) {
    return new Promise(resolve => {
      setTimeout(() => resolve(i * i), 0)
    })
  }

  afterAll(async () => {
    const client = new Redis()
    await client.del('test-memo:2')
    client.disconnect()
  })

  it('should memoizee function', async () => {
    const mock = jest.fn(testFunction)
    const memo = Cache.memo(mock)
    expect(await memo(1)).toBe(1)
    expect(mock).toBeCalledTimes(1)
    // cache hit
    expect(await memo(1)).toBe(1)
    expect(mock).toBeCalledTimes(1)
    // cache miss
    expect(await memo(2)).toBe(4)
    expect(mock).toBeCalledTimes(2)
  })

  it('should memo with cache', async () => {
    const mock = jest.fn(testFunction)
    const redisClient = new Redis(`redis://${redisHost}:${redisPort}`)
    const cache = new Cache('redis', redisClient)
    const memo = Cache.memoWithCache(mock, (n: number) => `test-memo:${n}`, cache, {
      wrap: { ttl: 10 },
    })
    expect(await memo(2)).toBe(4)
    expect(await redisClient.get('test-memo:2')).toBe('4')
    expect(await cache.get('test-memo:2')).toBe(4)
    expect(mock).toBeCalledTimes(1)
    expect(await memo(2)).toBe(4)
    expect(mock).toBeCalledTimes(1)

    await cache.close()
  })
})
