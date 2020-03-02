import { Cache } from '../src'
import { testFunc, testValue } from './helpers'

function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

describe('#MemoryCache', () => {
  const cache = new Cache('memory', { max: 1000 })
  const testKey = 'test-key'
  const testWrap = 'test-wrap-key'
  const testWrapTTL = 'test-wrap-ttl'

  it('should get nothing', async () => {
    const r = await cache.get('nothing')
    return expect(r).toBeNull()
  })

  it('should set and get cache', async () => {
    await cache.set(testKey, testValue)
    const r = await cache.get(testKey)
    expect(r).toEqual(testValue)
  })

  it('should del cache', async () => {
    await cache.del(testKey)
    expect(await cache.get(testKey)).toBeNull()
    await cache.set(testKey, testValue)
  })

  it('should wrap function', async () => {
    const res = await cache.wrap(testWrap, () => testFunc(), { ttl: 0 })
    expect(res).toEqual(testValue)
    expect(cache.store.stats()).toEqual({
      all: {
        call: 1,
        hit: 0,
        percent: 0,
      },
    })
  })

  it('should ignore some value', async () => {
    const testMock = jest.fn(testFunc)
    const cache = new Cache('memory', { max: 1000 }, { isCacheableValue: () => false })
    let res = await cache.wrap(testWrapTTL, () => testMock(), { ttl: 0 })
    expect(res).toEqual(testValue)
    expect(testMock).toBeCalledTimes(1)
    res = await cache.wrap(testWrapTTL, () => testMock(), { ttl: 0 })
    expect(res).toEqual(testValue)
    expect(testMock).toBeCalledTimes(2)
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

  it('should ttl work', async () => {
    const res = await cache.wrap(testWrapTTL, () => testFunc(), { ttl: 0.1 })
    expect(res).toEqual(testValue)
    await sleep(200)
    const r = await cache.get(testWrapTTL)
    expect(r).toBeNull()
  })
})
