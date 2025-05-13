const TextToSpeechClient = require('@google-cloud/text-to-speech').TextToSpeechClient
const fs = require('fs')
const path = require('path')
const proxyquire = require('proxyquire')
const tempfile = require('tempfile')

describe('GCP provider', () => {
  const chunks = ['hello world']

  let combineStub
  let fsStub
  let splitTextStub
  let GcpProvider
  let provider

  beforeEach(() => {
    combineStub = jasmine.createSpy('combine')
    fsStub = jasmine.createSpyObj('fs', ['writeFile'])
    fsStub.writeFile.and.callFake((dest, data, opts, callback) => { callback() })
    splitTextStub = jasmine.createSpy('splitText').and.returnValue(chunks)
    ;({ GcpProvider } = proxyquire('../../lib/providers/gcp', {
      'fs-extra': fsStub,
      '../combine-parts': {
        combine: combineStub
      },
      '../split-text': {
        splitText: splitTextStub
      }
    }))
    provider = new GcpProvider({
      email: 'foo@example.com',
      privateKey: 'private key',
      projectFile: 'project-file.json',
      projectId: 'project ID',
      format: 'mp3'
    })
  })

  describe('constructor', () => {
    it('should allow for no options', () => {
      expect(() => {
        provider = new GcpProvider()
      }).not.toThrow()
    })

    it('should set the name', () => {
      expect(provider.name).toBe('GCP')
    })

    it('should set the max character count to 5000', () => {
      expect(provider.maxCharacterCount).toBe(5000)
    })

    it('should set the language to "en-US" if not defined', () => {
      expect(provider.opts.language).toBe('en-US')
    })

    it('should set the language', () => {
      provider = new GcpProvider({
        email: 'foo@example.com',
        privateKey: 'private key',
        projectFile: 'project-file.json',
        projectId: 'project ID',
        language: 'en-GB'
      })
      expect(provider.opts.language).toBe('en-GB')
    })

    it('should have an underlying Google Cloud object', () => {
      expect(provider.instance).toEqual(jasmine.any(TextToSpeechClient))
    })

    it('should use the email address from the options', () => {
      expect(provider.instance.auth.jsonContent.client_email).toBe('foo@example.com')
    })

    it('should use the private key from the options', () => {
      expect(provider.instance.auth.jsonContent.private_key).toBe('private key')
    })

    it('should use the project ID from the options', () => {
      provider.instance.getProjectId().then(id => {
        expect(id).toBe('project ID')
      })
    })

    it('should leave out the project file if not specified', () => {
      provider = new GcpProvider({
        email: 'foo@example.com',
        'private-key': 'private key'
      })
      expect(provider.instance.auth.keyFilename).toBeUndefined()
    })

    it('should convert the project file to an absolute path if relative', () => {
      expect(provider.instance.auth.keyFilename).toBe(
        path.resolve('project-file.json')
      )
    })

    it('should use the project file as-is if an absolute path', () => {
      provider = new GcpProvider({
        email: 'foo@example.com',
        privateKey: 'fake key',
        projectFile: path.resolve('project-file.json')
      })
      expect(provider.instance.auth.keyFilename).toBe(
        path.resolve('project-file.json')
      )
    })

    it('should work if email and private key are not specified', () => {
      const filename = tempfile()
      const fakeProject = {
        client_email: 'foo@example.com',
        private_key: 'fake key'
      }
      fs.writeFileSync(filename, JSON.stringify(fakeProject), 'utf8')
      expect(() => {
        new GcpProvider({ 'project-file': filename }) // eslint-disable-line no-new
      }).not.toThrow()
    })
  })

  describe('extensionFor()', () => {
    it('should return "mp3" for the MP3 format', () => {
      expect(provider.extensionFor('mp3')).toBe('mp3')
    })

    it('should return "ogg" for the Ogg format', () => {
      expect(provider.extensionFor('ogg')).toBe('ogg')
    })

    it('should return "ogg" for the (deprecated) Ogg Vorbis format', () => {
      expect(provider.extensionFor('ogg_vorbis')).toBe('ogg')
    })

    it('should return "wav" for the PCM format', () => {
      expect(provider.extensionFor('pcm')).toBe('wav')
    })

    it('should throw an error for unknown formats', () => {
      expect(() => {
        provider.extensionFor('foo')
      }).toThrow()
    })
  })

  describe('buildInfo()', () => {
    it('should return an object with the expected properties', () => {
      const task = { foo: 1, bar: 2 }
      const info = provider.buildInfo('hello world', task)
      expect(info).toEqual({
        task,
        tempfile: jasmine.any(String),
        text: 'hello world',
        synthesizer: jasmine.any(Function)
      })
      expect(info.tempfile).toMatch(/\.mp3$/)
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
          effect: ['effect1', 'effect2'],
          gain: -1.2,
          gender: 'neutral',
          language: 'en-US',
          pitch: -9.8,
          sampleRate: 16000,
          speed: 4.2,
          type: 'text',
          voice: 'John'
        },
        response: 'fake audio data',
        text: 'hello world',
        url: 'http://example.com/'
      }
      synthesizer = jasmine.createSpy('synthesizer')
      info = {
        opts: testData.opts,
        task,
        tempfile: testData.filename,
        text: testData.text,
        synthesizer
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
        synthesizer.and.callFake((req, opts, cb) => {
          cb(null, { audioContent: testData.response })
        })
      })

      it('should update the task title', done => {
        provider.generate(info, testData.index, () => {
          expect(task.title).toMatch(`\\(${testData.index}/`)
          done()
        })
      })

      it('should work with the MP3 format', done => {
        testData.opts.format = 'mp3'
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.audioConfig.audioEncoding).toBe('MP3')
          done()
        })
      })

      it('should work with the OGG format', done => {
        testData.opts.format = 'ogg'
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.audioConfig.audioEncoding).toBe('OGG_OPUS')
          done()
        })
      })

      it('should work with the PCM format', done => {
        testData.opts.format = 'pcm'
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.audioConfig.audioEncoding).toBe('LINEAR16')
          done()
        })
      })

      it('should not use sample rate if not specified', done => {
        delete info.opts.sampleRate
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.audioConfig.sampleRateHertz).toBeUndefined()
          done()
        })
      })

      it('should use the sample rate, when specified', done => {
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.audioConfig.sampleRateHertz).toBe(testData.opts.sampleRate)
          done()
        })
      })

      it('should use the given (plain) text', done => {
        testData.opts.type = 'text'
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.input.text).toBe(testData.text)
          expect(opts.input.ssml).toBeUndefined()
          done()
        })
      })

      it('should use the given (SSML) text', done => {
        testData.opts.type = 'ssml'
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.input.ssml).toBe(testData.text)
          expect(opts.input.text).toBeUndefined()
          done()
        })
      })

      it('should not use effects if not specified', done => {
        delete info.opts.effect
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.audioConfig.effectsProfileId).toBeUndefined()
          done()
        })
      })

      it('should use the effects, when specified', done => {
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.audioConfig.effectsProfileId).toEqual(testData.opts.effect)
          done()
        })
      })

      it('should use the given volume gain', done => {
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.audioConfig.volumeGainDb).toBe(testData.opts.gain)
          done()
        })
      })

      it('should use the given gender', done => {
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.voice.ssmlGender).toBe(testData.opts.gender.toUpperCase())
          done()
        })
      })

      it('should leave out gender if not specified', done => {
        delete testData.opts.gender
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.voice.ssmlGender).toBeUndefined()
          done()
        })
      })

      it('should use the given language', done => {
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.voice.languageCode).toBe(testData.opts.language)
          done()
        })
      })

      it('should use the given pitch', done => {
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.audioConfig.pitch).toBe(testData.opts.pitch)
          done()
        })
      })

      it('should use the given speed', done => {
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.audioConfig.speakingRate).toBe(testData.opts.speed)
          done()
        })
      })

      it('should use the given voice', done => {
        provider.generate(info, 0, () => {
          const opts = synthesizer.calls.mostRecent().args[0]
          expect(opts.voice.name).toBe(testData.opts.voice)
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
        synthesizer.and.callFake((req, opts, cb) => {
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
        synthesizer.and.callFake((req, opts, cb) => {
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
