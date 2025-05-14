const proxyquire = require('proxyquire')

describe('readText()', () => {
  const testData = 'hello world'

  let readText
  let fsSpy
  let stdin

  beforeEach(() => {
    fsSpy = jasmine.createSpyObj('fs', ['readFile', 'readFileSync'])
    ;({ readText } = proxyquire('../lib/read-text', {
      'fs-extra': fsSpy
    }))
  })

  beforeEach(() => {
    let sentData = false
    stdin = jasmine.createSpyObj('stdin', ['on', 'read', 'setEncoding'])
    stdin.on.and.callFake((type, callback) => { callback() })
    stdin.read.and.callFake(() => {
      const response = sentData ? null : testData
      sentData = true
      return response
    })
  })

  describe('when it succeeds', () => {
    it('should set the read text', done => {
      readText(null, { stdin }).then((text) => {
        expect(text).toBe(testData)
      }).then(done)
    })
  })

  describe('when no filename is specified', () => {
    it('should read data from stdin', done => {
      readText(null, { stdin }).then(() => {
        expect(stdin.on).toHaveBeenCalled()
        expect(stdin.read).toHaveBeenCalled()
      }).then(done)
    })

    it('should use UTF-8 encoding', done => {
      readText(null, { stdin }).then(() => {
        expect(stdin.setEncoding).toHaveBeenCalledWith('utf8')
      }).then(done)
    })
  })

  describe('when a filename is specified', () => {
    const testFilename = 'test.txt'

    beforeEach(() => {
      fsSpy.readFile.and.callFake((filename, opts, callback) => {
        callback(null, testData)
      })
    })

    it('should read data from the file', done => {
      readText(testFilename, { stdin }).then(() => {
        expect(fsSpy.readFile).toHaveBeenCalledWith(
          testFilename,
          'utf8',
          jasmine.any(Function)
        )
      }).then(done)
    })

    describe('and can read the file', () => {
      it('should set the file\'s data', done => {
        readText(testFilename, { stdin }).then((text) => {
          expect(text).toBe(testData)
        }).then(done)
      })
    })

    describe('and cannot read the file', () => {
      it('should reject with the error', done => {
        const testError = 'error object'
        fsSpy.readFile.and.callFake((filename, opts, callback) => {
          callback(testError)
        })
        readText(testFilename, { stdin }).catch(err => {
          expect(err).toBe(testError)
        }).then(done)
      })
    })
  })
})
