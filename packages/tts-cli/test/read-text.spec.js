const proxyquire = require('proxyquire')

describe('readText()', () => {
  const testData = 'hello world'

  let readText
  let fsSpy
  let stdin

  beforeEach(() => {
    fsSpy = jasmine.createSpyObj('fs', ['readFile'])
    ;({ readText } = proxyquire('../lib/read-text', {
      'fs/promises': fsSpy
    }))
  })

  beforeEach(() => {
    stdin = {
      [Symbol.asyncIterator] () {
        let allDone = false
        return {
          next () {
            const done = allDone
            const value = done ? undefined : testData
            allDone = true
            return Promise.resolve({ value, done })
          },
          return () {
            return { done: true }
          }
        }
      },
      setEncoding: jasmine.createSpy('setEncoding')
    }
  })

  describe('when no filename is specified', () => {
    it('should read data from stdin', async () => {
      const text = await readText(null, { stdin })
      expect(text).toBe(testData)
    })

    it('should use UTF-8 encoding', async () => {
      await readText(null, { stdin })
      expect(stdin.setEncoding).toHaveBeenCalledWith('utf8')
    })
  })

  describe('when a filename is specified', () => {
    const testFilename = 'test.txt'

    beforeEach(() => {
      fsSpy.readFile.and.callFake((filename, opts) => Promise.resolve(testData))
    })

    it('should read data from the file', async () => {
      await readText(testFilename, { stdin })
      expect(fsSpy.readFile).toHaveBeenCalledWith(testFilename, 'utf8')
    })

    describe('and can read the file', () => {
      it('should set the file\'s data', async () => {
        const text = await readText(testFilename, { stdin })
        expect(text).toBe(testData)
      })
    })

    describe('and cannot read the file', () => {
      it('should reject with the error', async () => {
        const testError = 'error object'
        fsSpy.readFile.and.callFake((filename, opts) => Promise.reject(testError))
        try {
          await readText(testFilename, { stdin })
          throw new Error('Expected readText to throw an error')
        } catch (err) {
          expect(err).toBe(testError)
        }
      })
    })
  })
})
