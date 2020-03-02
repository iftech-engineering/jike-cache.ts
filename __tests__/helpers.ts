export const testValue = {
  something: [1, 2, 3],
  bool: true,
}

export async function testFunc(willReject = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (willReject) {
        return reject(new Error('For test'))
      }
      resolve(testValue)
    }, 100)
  })
}
