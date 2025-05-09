const { Polly } = require('@aws-sdk/client-polly')
const fs = require('fs')
const proxyquire = require('proxyquire')
const { Readable } = require('stream')
const tempfile = require('tempfile')

describe('AWS provider', () => {
  const chunks = ['hello world']
  const manifestFile = 'manifest.txt'
  const parts = ['foo.txt', 'bar.txt']
  const text = 'hello world'

  let combineStub
  let createManifestStub
  let fsStub
  let generateAllStub
  let splitTextStub
  let AwsProvider
  let provider

  beforeEach(() => {
    combineStub = jasmine.createSpy('combine')
    createManifestStub = jasmine.createSpy('createManifest').and.returnValue(manifestFile)
    fsStub = jasmine.createSpyObj('fs', ['createWriteStream'])
    fsStub.createWriteStream.and.callFake(filename => {
      const stream = fs.createWriteStream(filename)
      return stream
    })
    generateAllStub = jasmine.createSpy('generateAll').and.returnValue(Promise.resolve(parts))
    splitTextStub = jasmine.createSpy('splitText').and.returnValue(chunks)
    ;({ AwsProvider } = proxyquire('../../lib/providers/aws', {
      'fs-extra': fsStub,
      '../combine-parts': {
        combine: combineStub
      },
      '../generate-speech': {
        createManifest: createManifestStub,
        generateAll: generateAllStub
      },
      '../split-text': {
        splitText: splitTextStub
      }
    }))
    provider = new AwsProvider({
      region: 'aws-west-1',
      accessKey: 'ACCESS KEY',
      secretKey: 'SECRET KEY',
      format: 'mp3'
    })
  })

  describe('constructor', () => {
    it('should allow for no options', () => {
      expect(() => {
        provider = new AwsProvider()
      }).not.toThrow()
    })

    it('should set the name', () => {
      expect(provider.name).toBe('AWS')
    })

    it('should set the max character count to 1500', () => {
      expect(provider.maxCharacterCount).toBe(1500)
    })

    it('should set an "ogg_vorbis" format to "ogg"', () => {
      provider = new AwsProvider({
        region: 'aws-west-1',
        accessKey: 'ACCESS KEY',
        secretKey: 'SECRET KEY',
        format: 'ogg_vorbis'
      })
      expect(provider.opts.format).toBe('ogg')
    })

    it('should set the voice', () => {
      provider = new AwsProvider({
        region: 'aws-west-1',
        accessKey: 'ACCESS KEY',
        secretKey: 'SECRET KEY',
        voice: 'Oliver'
      })
      expect(provider.opts.voice).toBe('Oliver')
    })

    it('should set the voice to "Joanna" if not defined', () => {
      expect(provider.opts.voice).toBe('Joanna')
    })

    it('should have an underlying AWS object', () => {
      expect(provider.instance).toEqual(jasmine.any(Polly))
    })

    it('should configure the Polly object from the options', async () => {
      const credentials = await provider.instance.config.credentials()
      const region = await provider.instance.config.region()
      expect(region).toBe('aws-west-1')
      expect(credentials.accessKeyId).toBe('ACCESS KEY')
      expect(credentials.secretAccessKey).toBe('SECRET KEY')
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

    it('should return "pcm" for the PCM format', () => {
      expect(provider.extensionFor('pcm')).toBe('pcm')
    })

    it('should throw an error for unknown formats', () => {
      expect(() => {
        provider.extensionFor('foo')
      }).toThrow()
    })
  })

  describe('splitText()', () => {
    it('should call the splitText routine with the correct parameters', () => {
      const result = provider.splitText(text)
      expect(splitTextStub).toHaveBeenCalledWith(text, provider.maxCharacterCount, provider.opts.type)
      expect(result).toEqual(chunks)
    })
  })

  describe('combineAudio()', () => {
    it('should call combine() for raw audio', async () => {
      provider = new AwsProvider({
        region: 'aws-west-1',
        accessKey: 'ACCESS KEY',
        secretKey: 'SECRET KEY',
        format: 'pcm',
        ffmpeg: 'ffmpeg-test'
      })
      await provider.combineAudio('foobar')
      const args = combineStub.calls.mostRecent().args
      expect(args[0]).toBe('foobar')
      expect(args[1]).toMatch(/\.pcm$/)
      expect(args[2]).toBe('raw')
      expect(args[3]).toBe('ffmpeg-test')
    })

    it('should call combine() for encoded audio', async () => {
      provider = new AwsProvider({
        region: 'aws-west-1',
        accessKey: 'ACCESS KEY',
        secretKey: 'SECRET KEY',
        format: 'mp3',
        ffmpeg: 'ffmpeg-test'
      })
      await provider.combineAudio('foobar')
      const args = combineStub.calls.mostRecent().args
      expect(args[0]).toBe('foobar')
      expect(args[1]).toMatch(/\.mp3$/)
      expect(args[2]).toBe('encoded')
      expect(args[3]).toBe('ffmpeg-test')
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
        send: jasmine.any(Function)
      })
      expect(info.tempfile).toMatch(/\.mp3$/)
    })
  })

  describe('generate()', () => {
    let task, testData, info, send

    beforeEach(() => {
      task = {
        title: 'Convert to audio (0/42)'
      }
      testData = {
        filename: tempfile(),
        index: 6,
        opts: {
          engine: 'neural',
          format: 'ogg',
          language: 'en-US',
          lexicon: ['lexicon1', 'lexicon2'],
          sampleRate: 16000,
          type: 'ssml',
          voice: 'John'
        },
        text: 'hello world',
        url: 'http://example.com/'
      }
      const inStream = new Readable({
        read () {
          this.push('testing')
          this.push(null)
        }
      })
      send = jasmine.createSpy('send').and.resolveTo({
        AudioStream: inStream
      })
      info = {
        opts: testData.opts,
        task,
        tempfile: testData.filename,
        text: testData.text,
        send
      }
    })

    afterEach(done => {
      fs.access(testData.filename, fs.constants.F_OK, err => {
        if (err) { return done() }
        fs.unlink(testData.filename, done)
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
        const command = send.calls.mostRecent().args[0]
        expect(command.input.OutputFormat).toBe('mp3')
        done()
      })
    })

    it('should work with the OGG format', done => {
      testData.opts.format = 'ogg'
      provider.generate(info, 0, () => {
        const command = send.calls.mostRecent().args[0]
        expect(command.input.OutputFormat).toBe('ogg_vorbis')
        done()
      })
    })

    it('should work with the PCM format', done => {
      testData.opts.format = 'pcm'
      provider.generate(info, 0, () => {
        const command = send.calls.mostRecent().args[0]
        expect(command.input.OutputFormat).toBe('pcm')
        done()
      })
    })

    it('should use the given voice engine', done => {
      provider.generate(info, 0, () => {
        const command = send.calls.mostRecent().args[0]
        expect(command.input.Engine).toBe('neural')
        done()
      })
    })

    it('should not use sample rate if not specified', done => {
      delete info.opts.sampleRate
      provider.generate(info, 0, () => {
        const command = send.calls.mostRecent().args[0]
        expect(command.input.SampleRate).toBeUndefined()
        done()
      })
    })

    it('should use the (stringified) sample rate, when specified', done => {
      provider.generate(info, 0, () => {
        const command = send.calls.mostRecent().args[0]
        expect(command.input.SampleRate).toBe(String(testData.opts.sampleRate))
        done()
      })
    })

    it('should not use lexicon names if not specified', done => {
      delete info.opts.lexicon
      provider.generate(info, 0, () => {
        const command = send.calls.mostRecent().args[0]
        expect(command.input.LexiconNames).toBeUndefined()
        done()
      })
    })

    it('should use the lexicon names, when specified', done => {
      provider.generate(info, 0, () => {
        const command = send.calls.mostRecent().args[0]
        expect(command.input.LexiconNames).toEqual(testData.opts.lexicon)
        done()
      })
    })

    it('should use the given text type', done => {
      provider.generate(info, 0, () => {
        const command = send.calls.mostRecent().args[0]
        expect(command.input.TextType).toBe(testData.opts.type)
        done()
      })
    })

    it('should use the given text part', done => {
      provider.generate(info, 0, () => {
        const command = send.calls.mostRecent().args[0]
        expect(command.input.Text).toBe(testData.text)
        done()
      })
    })

    it('should not use a language if not specified', done => {
      delete info.opts.language
      provider.generate(info, 0, () => {
        const command = send.calls.mostRecent().args[0]
        expect(command.input.LanguageCode).toBeUndefined()
        done()
      })
    })

    it('should use the language, when specified', done => {
      provider.generate(info, 0, () => {
        const command = send.calls.mostRecent().args[0]
        expect(command.input.LanguageCode).toBe(testData.opts.language)
        done()
      })
    })

    it('should use the given voice', done => {
      provider.generate(info, 0, () => {
        const command = send.calls.mostRecent().args[0]
        expect(command.input.VoiceId).toBe(String(testData.opts.voice))
        done()
      })
    })

    it('should pipe the resulting stream into the file', done => {
      provider.generate(info, 0, () => {
        const contents = fs.readFileSync(testData.filename, 'utf-8')
        expect(contents).toBe('testing')
        done()
      })
    })

    it('should callback with an error if send() fails', done => {
      info.send = jasmine.createSpy('send').and.rejectWith(new Error('test error'))
      provider.generate(info, 0, err => {
        expect(err).toEqual(new Error('test error'))
        done()
      })
    })

    it('should callback with an error if file saving fails', done => {
      fsStub.createWriteStream.and.callFake(filename => {
        const stream = fs.createWriteStream(filename)
        stream.on('pipe', () => {
          stream.emit('error', new Error('write stream error'))
        })
        return stream
      })
      provider.generate(info, 0, err => {
        expect(err).toEqual(new Error('write stream error'))
        done()
      })
    })
  })

  describe('generateSpeech()', () => {
    it('should call generateAll()', async () => {
      const task = {}
      await provider.generateSpeech(chunks, task)
      expect(generateAllStub).toHaveBeenCalledWith([{
        task,
        tempfile: jasmine.any(String),
        text: chunks[0],
        send: jasmine.any(Function)
      }], provider.opts.limit, jasmine.any(Function), task)
    })

    it('should call createManifest()', async () => {
      await provider.generateSpeech(chunks, {})
      expect(createManifestStub).toHaveBeenCalledWith(parts)
    })

    it('should return the manifest file', async () => {
      const result = await provider.generateSpeech(chunks, {})
      expect(result).toBe(manifestFile)
    })
  })
})
