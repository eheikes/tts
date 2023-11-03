const { Polly } = require('@aws-sdk/client-polly')
const fs = require('fs')
const { Readable } = require('stream')
const tempfile = require('tempfile')

describe('AWS provider', () => {
  let create
  let PollyProvider
  let provider

  beforeEach(() => {
    ({ create, PollyProvider } = require('../helpers').loadLib('providers/aws'))
    provider = create({
      region: 'aws-west-1',
      accessKey: 'ACCESS KEY',
      secretKey: 'SECRET KEY'
    })
  })

  describe('create()', () => {
    it('should create a provider instance', () => {
      expect(provider).toEqual(jasmine.any(PollyProvider))
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

  describe('buildPart()', () => {
    it('should return an object with a `send` property', () => {
      expect(provider.buildPart()).toEqual({
        send: jasmine.any(Function)
      })
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
        task: task,
        tempfile: testData.filename,
        text: testData.text,
        send: send
      }
    })

    afterEach(done => {
      fs.unlink(testData.filename, done)
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
        let command = send.calls.mostRecent().args[0]
        expect(command.input.OutputFormat).toBe('mp3')
        done()
      })
    })

    it('should work with the OGG format', done => {
      testData.opts.format = 'ogg'
      provider.generate(info, 0, () => {
        let command = send.calls.mostRecent().args[0]
        expect(command.input.OutputFormat).toBe('ogg_vorbis')
        done()
      })
    })

    it('should work with the PCM format', done => {
      testData.opts.format = 'pcm'
      provider.generate(info, 0, () => {
        let command = send.calls.mostRecent().args[0]
        expect(command.input.OutputFormat).toBe('pcm')
        done()
      })
    })

    it('should use the given voice engine', done => {
      provider.generate(info, 0, () => {
        let command = send.calls.mostRecent().args[0]
        expect(command.input.Engine).toBe('neural')
        done()
      })
    })

    it('should not use sample rate if not specified', done => {
      delete info.opts.sampleRate
      provider.generate(info, 0, () => {
        let command = send.calls.mostRecent().args[0]
        expect(command.input.SampleRate).toBeUndefined()
        done()
      })
    })

    it('should use the (stringified) sample rate, when specified', done => {
      provider.generate(info, 0, () => {
        let command = send.calls.mostRecent().args[0]
        expect(command.input.SampleRate).toBe(String(testData.opts.sampleRate))
        done()
      })
    })

    it('should not use lexicon names if not specified', done => {
      delete info.opts.lexicon
      provider.generate(info, 0, () => {
        let command = send.calls.mostRecent().args[0]
        expect(command.input.LexiconNames).toBeUndefined()
        done()
      })
    })

    it('should use the lexicon names, when specified', done => {
      provider.generate(info, 0, () => {
        let command = send.calls.mostRecent().args[0]
        expect(command.input.LexiconNames).toEqual(testData.opts.lexicon)
        done()
      })
    })

    it('should use the given text type', done => {
      provider.generate(info, 0, () => {
        let command = send.calls.mostRecent().args[0]
        expect(command.input.TextType).toBe(testData.opts.type)
        done()
      })
    })

    it('should use the given text part', done => {
      provider.generate(info, 0, () => {
        let command = send.calls.mostRecent().args[0]
        expect(command.input.Text).toBe(testData.text)
        done()
      })
    })

    it('should not use a language if not specified', done => {
      delete info.opts.language
      provider.generate(info, 0, () => {
        let command = send.calls.mostRecent().args[0]
        expect(command.input.LanguageCode).toBeUndefined()
        done()
      })
    })

    it('should use the language, when specified', done => {
      provider.generate(info, 0, () => {
        let command = send.calls.mostRecent().args[0]
        expect(command.input.LanguageCode).toBe(testData.opts.language)
        done()
      })
    })

    it('should use the given voice', done => {
      provider.generate(info, 0, () => {
        let command = send.calls.mostRecent().args[0]
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
  })
})
