describe('generateAll()', () => {
  let async, generateAll, task
  let iteratorFunction

  const testLimit = 2
  const textParts = [
    'hello', 'world', 'how are you?'
  ]

  beforeEach(() => {
    iteratorFunction = jasmine.createSpy('async iterator')
    iteratorFunction.and.callFake((data, i, callback) => { callback() })
    task = { title: '' }
    const helpers = require('./helpers').loadLib('generate-speech')
    async = helpers.async
    generateAll = helpers.generateAll
  })

  it('should asynchronously call the function for each of the parts', done => {
    generateAll(textParts, { limit: testLimit }, iteratorFunction, task).then(() => {
      let [parts] = async.eachOfLimit.calls.mostRecent().args
      expect(parts).toEqual(textParts)
      expect(parts.length).toBe(textParts.length)
      expect(iteratorFunction.calls.count()).toBe(textParts.length)
    }).then(done)
  })

  it('should limit the async calls according to the option', done => {
    generateAll(textParts, { limit: testLimit }, iteratorFunction, task).then(() => {
      let [, limit] = async.eachOfLimit.calls.mostRecent().args
      expect(limit).toBe(testLimit)
    }).then(done)
  })

  describe('initial spinner', () => {
    beforeEach(done => {
      async.eachOfLimit.and.callFake((parts, opts, func, callback) => {
        callback(new Error('reject async'))
      })
      generateAll(textParts, {}, iteratorFunction, task).catch(() => {
        done()
      })
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
    it('should respond with the original parts', done => {
      generateAll(textParts, { limit: testLimit }, iteratorFunction, task).then(response => {
        expect(response).toEqual(textParts)
      }).then(done)
    })

    it('should show the final count', done => {
      generateAll(textParts, { limit: testLimit }, iteratorFunction, task).then(() => {
        expect(task.title).toMatch(`\\(${textParts.length}/`)
      }).then(done)
    })
  })

  describe('when a request fails', () => {
    const testError = 'test error'

    beforeEach(() => {
      iteratorFunction.and.callFake((data, i, callback) => {
        callback(new Error(testError))
      })
    })

    it('should return a rejected promise with the error', done => {
      generateAll(textParts, { limit: testLimit }, iteratorFunction, task).catch(err => {
        expect(err.message).toBe(testError)
      }).then(done)
    })
  })
})
