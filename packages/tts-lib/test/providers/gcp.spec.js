const TextToSpeechClient = require('@google-cloud/text-to-speech').TextToSpeechClient
const { writeFile } = require('fs/promises')
const path = require('path')
const proxyquire = require('proxyquire')
const tempfile = require('tempfile')

describe('GCP provider', () => {
  let fsStub
  let GcpProvider
  let provider

  beforeEach(() => {
    fsStub = jasmine.createSpyObj('fs', ['writeFile'])
    fsStub.writeFile.and.callFake((_dest, _data, _opts) => { Promise.resolve() })
    ;({ GcpProvider } = proxyquire('../../lib/providers/gcp', {
      'fs/promises': fsStub
    }))
    provider = new GcpProvider({
      projectId: 'project ID',
      format: 'mp3'
    })
  })

  describe('constructor', () => {
    beforeEach(() => {
      provider = new GcpProvider({
        email: 'foo@example.com',
        privateKey: 'private key',
        projectFile: 'project-file.json',
        projectId: 'project ID',
        format: 'mp3'
      })
    })
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

  describe('generate()', () => {
    const text = 'hello world'
    const response = 'fake audio data'

    beforeEach(() => {
      spyOn(provider.instance, 'synthesizeSpeech')
    })

    it('should call the synthesizer function', async () => {
      provider.instance.synthesizeSpeech.and.callFake((_req, _opts, done) => done(null, {}))
      await provider.generate(text)
      expect(provider.instance.synthesizeSpeech).toHaveBeenCalled()
    })

    describe('when everything works', () => {
      beforeEach(() => {
        provider.instance.synthesizeSpeech.and.callFake((_req, _opts, cb) => {
          cb(null, { audioContent: response })
        })
      })

      it('should work with the MP3 format', async () => {
        provider.opts.format = 'mp3'
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.audioConfig.audioEncoding).toBe('MP3')
      })

      it('should work with the OGG format', async () => {
        provider.opts.format = 'ogg'
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.audioConfig.audioEncoding).toBe('OGG_OPUS')
      })

      it('should work with the PCM format', async () => {
        provider.opts.format = 'pcm'
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.audioConfig.audioEncoding).toBe('LINEAR16')
      })

      it('should not use sample rate if not specified', async () => {
        delete provider.opts.sampleRate
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.audioConfig.sampleRateHertz).toBeUndefined()
      })

      it('should use the sample rate, when specified', async () => {
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.audioConfig.sampleRateHertz).toBe(provider.opts.sampleRate)
      })

      it('should use the given (plain) text', async () => {
        provider.opts.type = 'text'
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.input.text).toBe(text)
        expect(opts.input.ssml).toBeUndefined()
      })

      it('should use the given (SSML) text', async () => {
        provider.opts.type = 'ssml'
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.input.ssml).toBe(text)
        expect(opts.input.text).toBeUndefined()
      })

      it('should not use effects if not specified', async () => {
        delete provider.opts.effect
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.audioConfig.effectsProfileId).toBeUndefined()
      })

      it('should use the effects, when specified', async () => {
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.audioConfig.effectsProfileId).toEqual(provider.opts.effect)
      })

      it('should use the given volume gain', async () => {
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.audioConfig.volumeGainDb).toBe(provider.opts.gain)
      })

      it('should use the given gender', async () => {
        provider.opts.gender = 'female'
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.voice.ssmlGender).toBe(provider.opts.gender.toUpperCase())
      })

      it('should leave out gender if not specified', async () => {
        delete provider.opts.gender
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.voice.ssmlGender).toBeUndefined()
      })

      it('should use the given language', async () => {
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.voice.languageCode).toBe(provider.opts.language)
      })

      it('should use the given pitch', async () => {
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.audioConfig.pitch).toBe(provider.opts.pitch)
      })

      it('should use the given speed', async () => {
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.audioConfig.speakingRate).toBe(provider.opts.speed)
      })

      it('should use the given voice', async () => {
        await provider.generate(text)
        const opts = provider.instance.synthesizeSpeech.calls.mostRecent().args[0]
        expect(opts.voice.name).toBe(provider.opts.voice)
      })

      it('should write the GCP response to the temp file', async () => {
        await provider.generate(text)
        expect(fsStub.writeFile).toHaveBeenCalledWith(
          jasmine.any(String),
          response,
          'binary'
        )
      })

      it('should return the filename', async () => {
        const result = await provider.generate(text)
        expect(result.tempfile).toEqual(jasmine.any(String))
      })
    })

    describe('when GCP returns an error', () => {
      beforeEach(() => {
        provider.instance.synthesizeSpeech.and.callFake((_req, _opts, cb) => {
          cb(new Error('testing GCP error'))
        })
      })

      it('should call back with the error', async () => {
        try {
          await provider.generate(text)
          throw new Error('generate() should have thrown an error')
        } catch (err) {
          expect(err.message).toBe('testing GCP error')
        }
      })
    })

    describe('when file writing fails', () => {
      beforeEach(() => {
        provider.instance.synthesizeSpeech.and.callFake((_req, _opts, cb) => {
          cb(null, { audioContent: response })
        })
        fsStub.writeFile.and.callFake((_dest, _data, _opts) => {
          throw new Error('testing write error')
        })
      })

      it('should call back with the error', async () => {
        try {
          await provider.generate(text)
          throw new Error('generate() should have thrown an error')
        } catch (err) {
          expect(err.message).toBe('testing write error')
        }
      })
    })
  })
})
