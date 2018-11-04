const TextToSpeechClient = require('@google-cloud/text-to-speech').TextToSpeechClient
const fs = require('fs')
const tempfile = require('tempfile')

describe('Google Cloud provider', () => {
  let fsStub
  let create
  let GoogleProvider
  let provider

  beforeEach(() => {
    ({ fs: fsStub, create, GoogleProvider } = require('../helpers').loadLib('providers/gcp'))
    provider = create({})
  })

  describe('create()', () => {
    it('should create a provider instance', () => {
      expect(provider).toEqual(jasmine.any(GoogleProvider))
    })

    it('should have an underlying Google Cloud object', () => {
      expect(provider.instance).toEqual(jasmine.any(TextToSpeechClient))
    })
  })

  describe('buildPart()', () => {
    it('should return an object with a `synthesizer` property', () => {
      expect(provider.buildPart()).toEqual({
        synthesizer: jasmine.any(Function)
      })
    })
  })

  describe('generate()', () => {
    let task, testData, info, synthesizer

    beforeEach(() => {
      task = {
        title: 'Convert to audio (0/42)'
      }
      testData = {
        filename: tempfile(),
        index: 6,
        opts: {
        },
        response: 'fake audio data',
        text: 'hello world',
        url: 'http://example.com/'
      }
      synthesizer = jasmine.createSpy('synthesizer')
      info = {
        opts: testData.opts,
        task: task,
        tempfile: testData.filename,
        text: testData.text,
        synthesizer: synthesizer
      }
    })

    afterEach(done => {
      fs.unlink(testData.filename, () => {
        // ignore any errors
        done()
      })
    })

    it('should call the synthesizer function', done => {
      synthesizer.and.callFake(() => done())
      provider.generate(info, 0, () => {})
      expect(synthesizer).toHaveBeenCalled()
    })

    describe('when everything works', () => {
      beforeEach(() => {
        synthesizer.and.callFake((req, cb) => {
          cb(null, { audioContent: testData.response })
        })
      })

      it('should update the task title', done => {
        provider.generate(info, testData.index, () => {
          expect(task.title).toMatch(`\\(${testData.index}/`)
          done()
        })
      })

      it('should write the GCP response to the temp file', done => {
        provider.generate(info, 0, () => {
          expect(fsStub.writeFile).toHaveBeenCalledWith(
            testData.filename,
            testData.response,
            'binary',
            jasmine.any(Function)
          )
          done()
        })
      })
    })

    describe('when GCP returns an error', () => {
      beforeEach(() => {
        synthesizer.and.callFake((req, cb) => {
          cb(new Error('testing GCP error'))
        })
      })

      it('should call back with the error', done => {
        provider.generate(info, 0, (err) => {
          expect(err.message).toBe('testing GCP error')
          done()
        })
      })
    })

    describe('when file writing fails', () => {
      beforeEach(() => {
        synthesizer.and.callFake((req, cb) => {
          cb(null, { audioContent: testData.response })
        })
        fsStub.writeFile.and.callFake((dest, data, opts, cb) => {
          cb(new Error('testing write error'))
        })
      })

      it('should call back with the error', done => {
        provider.generate(info, 0, (err) => {
          expect(err.message).toBe('testing write error')
          done()
        })
      })
    })
  })
})
