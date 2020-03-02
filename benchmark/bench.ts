import * as fs from 'fs'
import * as _ from 'lodash'
import * as Redis from 'ioredis'
import { Cache } from '../src'

const redisClient = new Redis()
const cache = new Cache('redis', '127.0.0.1:6379')
const cache2 = new Cache('memory', { max: 1000 })

const packageLock = fs.readFileSync('./package-lock.json')
const parsed = JSON.parse(packageLock.toString())

async function saveTestData() {
  await redisClient.set('jike-cache-bench', packageLock)
}

async function testFetch() {
  const res = await redisClient.get('jike-cache-bench')
  if (res) {
    return JSON.parse(res)
  }
}

const singleFileTests = [
  {
    func: Cache.memo(testFetch, { ttl: 30 }),
    name: '#JikeCache Memoizee',
  },
  {
    func: () => cache.wrap('jike-cache-wrap', testFetch, { ttl: 30 }),
    name: '#JikeCache RedisStore Wrap',
  },
  {
    func: () => cache2.wrap('jike-cache-local-wrap', testFetch, { ttl: 30 }),
    name: '#JikeCache MemoryStore Wrap',
  },
  {
    func: () => parsed,
    name: 'LocalOnly(Baseline)',
  },
]

function print(stats: { name: string; cost: number }[]) {
  const sorted = _.sortBy(stats, 'cost')
  _.forEach(sorted, s => {
    console.log(`\t${s.name} cost: ${s.cost}ms`)
  })
}

async function singleRun(f: () => Promise<any>, batch: number, total: number) {
  for (let i = 0; i < total; i += batch) {
    await Promise.all(_.times(batch, f))
  }
}

async function run(tests: { func: any; name: string }[]) {
  const res = []
  for (const test of tests) {
    console.log('Start bench', test.name)
    const start = Date.now()
    await singleRun(test.func, 10, 50000)
    res.push({ name: test.name, cost: Date.now() - start })
    console.log('End bench', test.name)
  }
  print(res)
}

saveTestData()
  .then(() => {
    return run(singleFileTests)
  })
  .then(() => {
    console.log('Done!')
  })
