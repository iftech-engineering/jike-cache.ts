module.exports = {
  preset: 'ts-jest',
  collectCoverage: true,
  testEnvironment: 'node',
  testRegex: '__tests__/.*.(test|spec).ts$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
}
