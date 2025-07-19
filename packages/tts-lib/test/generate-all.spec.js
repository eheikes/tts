const async = require('async')
const proxyquire = require('proxyquire')

describe('generateAll()', () => {
  let generateAll
  let asyncSpy
  let iteratorFunction

  const testLimit = 2
  const textParts = [
    'hello', 'world', 'how are you?'
  ]

  beforeEach(() => {
    iteratorFunction = jasmine.createSpy('iterator').and.callFake((data) => Promise.resolve(data))
    asyncSpy = jasmine.createSpyObj('async', ['mapLimit'])
    asyncSpy.mapLimit.and.callFake(async.mapLimit)
    ;({ generateAll } = proxyquire('../lib/generate-all', {
      async: asyncSpy
    }))
  })

  it('should asynchronously call the function for each of the parts', async () => {
    await generateAll(textParts, testLimit, async () => iteratorFunction())
    const [parts] = asyncSpy.mapLimit.calls.mostRecent().args
    expect(parts).toEqual(textParts)
    expect(parts.length).toBe(textParts.length)
    expect(iteratorFunction.calls.count()).toBe(textParts.length)
  })

  it('should limit the async calls according to the option', async () => {
    await generateAll(textParts, testLimit, async () => iteratorFunction())
    const [, limit] = asyncSpy.mapLimit.calls.mostRecent().args
    expect(limit).toBe(testLimit)
  })

  describe('when all requests succeed', () => {
    it('should respond with the original parts', async () => {
      const response = await generateAll(textParts, testLimit, async (x) => iteratorFunction(x))
      expect(response).toEqual(textParts)
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
        await generateAll(textParts, testLimit, async (x) => iteratorFunction(x))
        throw new Error('Expected generateAll to throw an error')
      } catch (err) {
        expect(err.message).toBe(testError)
      }
    })
  })
})
