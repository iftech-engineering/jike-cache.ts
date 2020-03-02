# Welcome to @ruguoapp/cache 👋

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg?cacheSeconds=2592000)

> Modern high performance cache for Node.js

## Install

```sh
npm install @ruguoapp/cache
```

## Feature

- Support multiple store
- Support Memoize function
- Support `prefix` for keys
- Statistics for cache miss
- Nearly 100% test coverage via Jest

### Support Store

- Redis
- [memoizee](https://github.com/medikoo/memoizee)
- [quick-lru](https://github.com/sindresorhus/quick-lru/)

## Usage

```typescript
import Cache from '@ruguoapp/cache'
const cache = new Cache('127.0.0.1:6379', {
  ttl: 10,
  prefix: 'jike:',
}) // OR
const cache = new Cache('redis', 'redis://127.0.0.1:6379/0') // OR
const cache = new Cache('redis', redisClient) // OR
const cache = new Cache('redis', { host: '127.0.0.1', port: 6379 })

const value = await cache.get('key')
await cache.set('key', value, { ttl: 10 })
await cache.wrap('key', () => async_function(), { ttl: 10 })
await cache.del('key', 'key2')
```

### Nearly fastest Memoizee functions

more use case: https://github.com/medikoo/memoizee

```typescript
import Cache from '@ruguoapp/cache'

const cachedFunction = Cache.memo(fetchUserInfo, {
  ttl: 10, // 10 seconds
  preFetch: true, // prefetch before cache expire
  max: 100, // save 100 different arguments
})

const userInfo = await cachedFunction('userId1', { lean: true }) // will call fetchUserInfo
await cachedFunction('userId1', { lean: true }) // hit!
await cachedFunction('userId1') // will call fetchUserInfo
await cachedFunction('userId1') // hit!
```

**Combine memoizee and cache, like a multi-level cache**

```typescript
import Cache from '@ruguoapp/cache'

const cache = new Cache('redis', '127.0.0.1:6379')

const cachedFunction = Cache.memoWithCache(
  fetchUserInfoFromDb,
  (uid: string) => `cache:${uid}`,
  cache,
  {
    memo: { ttl: 30, max: 1000 },
    wrap: { ttl: 60 },
  },
)
```

## Run tests

```sh
npm test
```

## Benchmark

```sh
npm run bench
```

```
Total: 50000, Bench: 10

LocalOnly(Baseline) cost: 20ms
	#JikeCache Memoizee cost: 26ms
	#JikeCache MemoryStore Wrap cost: 139ms
	#RedisCache MemoryStore Wrap cost: 193ms
	#JikeCache RedisStore Wrap cost: 7064ms
	#RedisCache RedisStore Wrap cost: 8901ms
```

## Test Converage

```
-------------|----------|----------|----------|----------|-------------------|
File         |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |
-------------|----------|----------|----------|----------|-------------------|
All files    |    90.26 |    80.25 |    94.59 |    90.13 |                   |
 __tests__   |      100 |      100 |      100 |      100 |                   |
  helpers.ts |      100 |      100 |      100 |      100 |                   |
 src         |    87.88 |    64.29 |      100 |     87.5 |                   |
  cache.ts   |    86.67 |    64.29 |      100 |    86.21 |       21,65,82,86 |
  index.ts   |      100 |      100 |      100 |      100 |                   |
 src/store   |    90.35 |    82.81 |    91.67 |    90.27 |                   |
  base.ts    |    76.92 |     62.5 |    83.33 |    76.92 |          35,45,56 |
  memory.ts  |    88.89 |    80.77 |       90 |    88.89 |    23,26,57,61,87 |
  redis.ts   |    94.64 |       90 |      100 |    94.55 |          32,60,64 |
-------------|----------|----------|----------|----------|-------------------|
```

## Author

👤 **Wangsiyuan**

- Github: [@0neSe7en](https://github.com/0neSe7en)
