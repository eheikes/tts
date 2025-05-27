const { Polly } = require('@aws-sdk/client-polly')
const { createWriteStream } = require('fs')
const { readFile, unlink } = require('fs/promises')
const proxyquire = require('proxyquire')
const { Readable } = require('stream')
const tempfile = require('tempfile')

describe('AWS provider', () => {
  const chunks = ['hello world']

  let combineStub
  let fsSpy
  let splitTextStub
  let AwsProvider
  let provider

  beforeEach(() => {
    combineStub = jasmine.createSpy('combine')
    fsSpy = jasmine.createSpyObj('fs', ['createWriteStream'])
    fsSpy.createWriteStream.and.callFake(filename => {
      const stream = createWriteStream(filename)
      return stream
    })
    splitTextStub = jasmine.createSpy('splitText').and.returnValue(chunks)
    ;({ AwsProvider } = proxyquire('../../lib/providers/aws', {
      fs: fsSpy,
      '../combine': {
        combine: combineStub
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
        opts: provider.opts,
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

    afterEach(async () => {
      try {
        await unlink(testData.filename)
      } catch (_err) {
        // Ignore errors.
      }
    })

    it('should update the task title', async () => {
      await provider.generate(info, testData.index)
      expect(task.title).toMatch(`\\(${testData.index}/`)
    })

    it('should work with the MP3 format', async () => {
      testData.opts.format = 'mp3'
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.OutputFormat).toBe('mp3')
    })

    it('should work with the OGG format', async () => {
      testData.opts.format = 'ogg'
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.OutputFormat).toBe('ogg_vorbis')
    })

    it('should work with the PCM format', async () => {
      testData.opts.format = 'pcm'
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.OutputFormat).toBe('pcm')
    })

    it('should use the given voice engine', async () => {
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.Engine).toBe('neural')
    })

    it('should not use sample rate if not specified', async () => {
      delete info.opts.sampleRate
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.SampleRate).toBeUndefined()
    })

    it('should use the (stringified) sample rate, when specified', async () => {
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.SampleRate).toBe(String(testData.opts.sampleRate))
    })

    it('should not use lexicon names if not specified', async () => {
      delete info.opts.lexicon
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.LexiconNames).toBeUndefined()
    })

    it('should use the lexicon names, when specified', async () => {
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.LexiconNames).toEqual(testData.opts.lexicon)
    })

    it('should use the given text type', async () => {
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.TextType).toBe(testData.opts.type)
    })

    it('should use the given text part', async () => {
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.Text).toBe(testData.text)
    })

    it('should not use a language if not specified', async () => {
      delete info.opts.language
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.LanguageCode).toBeUndefined()
    })

    it('should use the language, when specified', async () => {
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.LanguageCode).toBe(testData.opts.language)
    })

    it('should use the given voice', async () => {
      await provider.generate(info, 0)
      const command = send.calls.mostRecent().args[0]
      expect(command.input.VoiceId).toBe(String(testData.opts.voice))
    })

    it('should pipe the resulting stream into the file', async () => {
      await provider.generate(info, 0)
      const contents = await readFile(testData.filename, 'utf-8')
      expect(contents).toBe('testing')
    })

    it('should callback with an error if send() fails', async () => {
      info.send = jasmine.createSpy('send').and.rejectWith(new Error('test error'))
      try {
        await provider.generate(info, 0)
        throw new Error('generate() should have thrown an error')
      } catch (err) {
        expect(err).toEqual(new Error('test error'))
      }
    })

    it('should callback with an error if file saving fails', async () => {
      fsSpy.createWriteStream.and.callFake(filename => {
        const stream = createWriteStream(filename)
        stream.on('pipe', () => {
          stream.emit('error', new Error('write stream error'))
        })
        return stream
      })
      try {
        await provider.generate(info, 0)
        throw new Error('generate() should have thrown error')
      } catch (err) {
        expect(err).toEqual(new Error('write stream error'))
      }
    })
  })
})
