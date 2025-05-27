const async = require('async')
const proxyquire = require('proxyquire')

describe('generateAll()', () => {
  let generateAll, task
  let asyncSpy
  let iteratorFunction

  const testLimit = 2
  const textParts = [
    'hello', 'world', 'how are you?'
  ]

  beforeEach(() => {
    iteratorFunction = jasmine.createSpy('async iterator')
    iteratorFunction.and.callFake((data, i, callback) => { callback() })
    task = { title: '' }
    asyncSpy = jasmine.createSpyObj('async', ['eachOfLimit'])
    asyncSpy.eachOfLimit.and.callFake(async.eachOfLimit)
    ;({ generateAll } = proxyquire('../lib/generate-all', {
      async: asyncSpy
    }))
  })

  it('should asynchronously call the function for each of the parts', async () => {
    await generateAll(textParts, testLimit, iteratorFunction, task)
    const [parts] = asyncSpy.eachOfLimit.calls.mostRecent().args
    expect(parts).toEqual(textParts)
    expect(parts.length).toBe(textParts.length)
    expect(iteratorFunction.calls.count()).toBe(textParts.length)
  })

  it('should limit the async calls according to the option', async () => {
    await generateAll(textParts, testLimit, iteratorFunction, task)
    const [, limit] = asyncSpy.eachOfLimit.calls.mostRecent().args
    expect(limit).toBe(testLimit)
  })

  describe('initial spinner', () => {
    beforeEach(async () => {
      asyncSpy.eachOfLimit.and.callFake((parts, opts, func) => {
        throw new Error('reject async')
      })
      try {
        await generateAll(textParts, 1, iteratorFunction, task)
      } catch (_err) {
        // Ignore the error.
      }
    })

    it('should be updated', () => {
      expect(task.title).toMatch('Convert to audio')
    })

    it('should show the part count', () => {
      expect(task.title).toMatch(`/${textParts.length}\\)$`)
    })

    it('should start at 0', () => {
      expect(task.title).toMatch('\\(0/')
    })
  })

  describe('when all requests succeed', () => {
    it('should respond with the original parts', async () => {
      const response = await generateAll(textParts, testLimit, iteratorFunction, task)
      expect(response).toEqual(textParts)
    })

    it('should show the final count', async () => {
      await generateAll(textParts, testLimit, iteratorFunction, task)
      expect(task.title).toMatch(`\\(${textParts.length}/`)
    })
  })

  describe('when a request fails', () => {
    const testError = 'test error'

    beforeEach(() => {
      iteratorFunction.and.callFake((data, i) => {
        throw new Error(testError)
      })
    })

    it('should return a rejected promise with the error', async () => {
      try {
        await generateAll(textParts, testLimit, iteratorFunction, task)
        throw new Error('Expected generateAll to throw an error')
      } catch (err) {
        expect(err.message).toBe(testError)
      }
    })
  })
})
