const TextToSpeechClient = require('@google-cloud/text-to-speech').TextToSpeechClient
const { unlink, writeFile } = require('fs/promises')
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
    fsStub.writeFile.and.callFake((dest, data, opts) => { Promise.resolve() })
    splitTextStub = jasmine.createSpy('splitText').and.returnValue(chunks)
    ;({ GcpProvider } = proxyquire('../../lib/providers/gcp', {
      'fs/promises': fsStub,
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

    it('should use the project ID from the options', async () => {
      const id = await provider.instance.getProjectId()
      expect(id).toBe('project ID')
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

    it('should work if email and private key are not specified', async () => {
      const filename = tempfile()
      const fakeProject = {
        client_email: 'foo@example.com',
        private_key: 'fake key'
      }
      await writeFile(filename, JSON.stringify(fakeProject), 'utf8')
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
        opts: provider.opts,
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

    afterEach(async () => {
      try {
        await unlink(testData.filename)
      } catch (_err) {
        // Ignore any errors.
      }
    })

    it('should call the synthesizer function', async () => {
      synthesizer.and.callFake((_req, _opts, done) => done(null, {}))
      await provider.generate(info, 0, () => {})
      expect(synthesizer).toHaveBeenCalled()
    })

    describe('when everything works', () => {
      beforeEach(() => {
        synthesizer.and.callFake((req, opts, cb) => {
          cb(null, { audioContent: testData.response })
        })
      })

      it('should update the task title', async () => {
        await provider.generate(info, testData.index)
        expect(task.title).toMatch(`\\(${testData.index}/`)
      })

      it('should work with the MP3 format', async () => {
        testData.opts.format = 'mp3'
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.audioConfig.audioEncoding).toBe('MP3')
      })

      it('should work with the OGG format', async () => {
        testData.opts.format = 'ogg'
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.audioConfig.audioEncoding).toBe('OGG_OPUS')
      })

      it('should work with the PCM format', async () => {
        testData.opts.format = 'pcm'
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.audioConfig.audioEncoding).toBe('LINEAR16')
      })

      it('should not use sample rate if not specified', async () => {
        delete info.opts.sampleRate
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.audioConfig.sampleRateHertz).toBeUndefined()
      })

      it('should use the sample rate, when specified', async () => {
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.audioConfig.sampleRateHertz).toBe(testData.opts.sampleRate)
      })

      it('should use the given (plain) text', async () => {
        testData.opts.type = 'text'
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.input.text).toBe(testData.text)
        expect(opts.input.ssml).toBeUndefined()
      })

      it('should use the given (SSML) text', async () => {
        testData.opts.type = 'ssml'
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.input.ssml).toBe(testData.text)
        expect(opts.input.text).toBeUndefined()
      })

      it('should not use effects if not specified', async () => {
        delete info.opts.effect
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.audioConfig.effectsProfileId).toBeUndefined()
      })

      it('should use the effects, when specified', async () => {
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.audioConfig.effectsProfileId).toEqual(testData.opts.effect)
      })

      it('should use the given volume gain', async () => {
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.audioConfig.volumeGainDb).toBe(testData.opts.gain)
      })

      it('should use the given gender', async () => {
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.voice.ssmlGender).toBe(testData.opts.gender.toUpperCase())
      })

      it('should leave out gender if not specified', async () => {
        delete testData.opts.gender
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.voice.ssmlGender).toBeUndefined()
      })

      it('should use the given language', async () => {
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.voice.languageCode).toBe(testData.opts.language)
      })

      it('should use the given pitch', async () => {
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.audioConfig.pitch).toBe(testData.opts.pitch)
      })

      it('should use the given speed', async () => {
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.audioConfig.speakingRate).toBe(testData.opts.speed)
      })

      it('should use the given voice', async () => {
        await provider.generate(info, 0)
        const opts = synthesizer.calls.mostRecent().args[0]
        expect(opts.voice.name).toBe(testData.opts.voice)
      })

      it('should write the GCP response to the temp file', async () => {
        await provider.generate(info, 0)
        expect(fsStub.writeFile).toHaveBeenCalledWith(
          testData.filename,
          testData.response,
          'binary'
        )
      })
    })

    describe('when GCP returns an error', () => {
      beforeEach(() => {
        synthesizer.and.callFake((req, opts, cb) => {
          cb(new Error('testing GCP error'))
        })
      })

      it('should call back with the error', async () => {
        try {
          await provider.generate(info, 0)
          throw new Error('generate() should have thrown an error')
        } catch (err) {
          expect(err.message).toBe('testing GCP error')
        }
      })
    })

    describe('when file writing fails', () => {
      beforeEach(() => {
        synthesizer.and.callFake((req, opts, cb) => {
          cb(null, { audioContent: testData.response })
        })
        fsStub.writeFile.and.callFake((dest, data, opts) => {
          throw new Error('testing write error')
        })
      })

      it('should call back with the error', async () => {
        try {
          await provider.generate(info, 0)
          throw new Error('generate() should have thrown an error')
        } catch (err) {
          expect(err.message).toBe('testing write error')
        }
      })
    })
  })
})
