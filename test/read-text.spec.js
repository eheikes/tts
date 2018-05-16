describe('readText()', () => {
  const testData = 'hello world'

  let readText, fs
  let ctx

  beforeEach(() => {
    ({ readText, fs } = require('./helpers').loadLib('read-text'))
  })

  beforeEach(() => {
    let sentData = false
    stdin = jasmine.createSpyObj('stdin', ['on', 'read', 'setEncoding'])
    stdin.on.and.callFake((type, callback) => { callback() })
    stdin.read.and.callFake(() => {
      let response = sentData ? null : testData
      sentData = true
      return response
    })
    ctx = {
      input: null,
      process: {
        stdin: stdin
      }
    }
  })

  describe('when it succeeds', () => {
    it('should set the read text', done => {
      readText(ctx).then(() => {
        expect(ctx.text).toBe(testData)
      }).then(done)
    })
  })

  describe('when no filename is specified', () => {
    it('should read data from stdin', done => {
      readText(ctx).then(() => {
        expect(stdin.on).toHaveBeenCalled()
        expect(stdin.read).toHaveBeenCalled()
      }).then(done)
    })

    it('should use UTF-8 encoding', done => {
      readText(ctx).then(() => {
        expect(stdin.setEncoding).toHaveBeenCalledWith('utf8')
      }).then(done)
    })
  })

  describe('when a filename is specified', () => {
    const testFilename = 'test.txt'

    beforeEach(() => {
      ctx.input = testFilename
      fs.readFile.and.callFake((filename, opts, callback) => {
        callback(null, testData)
      })
    })

    it('should read data from the file', done => {
      readText(ctx).then(() => {
        expect(fs.readFile).toHaveBeenCalledWith(
          testFilename,
          'utf8',
          jasmine.any(Function)
        )
      }).then(done)
    })

    describe('and can read the file', () => {
      it('should set the file\'s data', done => {
        readText(ctx).then(() => {
          expect(ctx.text).toBe(testData)
        }).then(done)
      })
    })

    describe('and cannot read the file', () => {
      it('should reject with the error', done => {
        const testError = 'error object'
        fs.readFile.and.callFake((filename, opts, callback) => {
          callback(testError)
        })
        readText(ctx).catch(err => {
          expect(err).toBe(testError)
        }).then(done)
      })
    })
  })
})
