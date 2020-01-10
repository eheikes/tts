const Polly = require('aws-sdk/clients/polly').Presigner
const fs = require('fs')
const tempfile = require('tempfile')

describe('AWS provider', () => {
  let got
  let create
  let PollyProvider
  let provider

  beforeEach(() => {
    ({ got, create, PollyProvider } = require('../helpers').loadLib('providers/aws'))
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

    it('should configure the Polly object from the options', () => {
      expect(provider.instance.options.region).toBe('aws-west-1')
      expect(provider.instance.options.accessKeyId).toBe('ACCESS KEY')
      expect(provider.instance.options.secretAccessKey).toBe('SECRET KEY')
    })
  })

  describe('buildPart()', () => {
    it('should return an object with a `urlcreator` property', () => {
      expect(provider.buildPart()).toEqual({
        urlcreator: jasmine.any(Function)
      })
    })
  })

  describe('generate()', () => {
    let task, testData, info, urlCreator

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
      urlCreator = jasmine.createSpy('urlcreator').and.returnValue(testData.url)
      info = {
        opts: testData.opts,
        task: task,
        tempfile: testData.filename,
        text: testData.text,
        urlcreator: urlCreator
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
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.OutputFormat).toBe('mp3')
        done()
      })
    })

    it('should work with the OGG format', done => {
      testData.opts.format = 'ogg'
      provider.generate(info, 0, () => {
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.OutputFormat).toBe('ogg_vorbis')
        done()
      })
    })

    it('should work with the PCM format', done => {
      testData.opts.format = 'pcm'
      provider.generate(info, 0, () => {
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.OutputFormat).toBe('pcm')
        done()
      })
    })

    it('should use the given voice engine', done => {
      provider.generate(info, 0, () => {
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.Engine).toBe('neural')
        done()
      })
    })

    it('should not use sample rate if not specified', done => {
      delete info.opts.sampleRate
      provider.generate(info, 0, () => {
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.SampleRate).toBeUndefined()
        done()
      })
    })

    it('should use the (stringified) sample rate, when specified', done => {
      provider.generate(info, 0, () => {
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.SampleRate).toBe(String(testData.opts.sampleRate))
        done()
      })
    })

    it('should not use lexicon names if not specified', done => {
      delete info.opts.lexicon
      provider.generate(info, 0, () => {
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.LexiconNames).toBeUndefined()
        done()
      })
    })

    it('should use the lexicon names, when specified', done => {
      provider.generate(info, 0, () => {
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.LexiconNames).toEqual(testData.opts.lexicon)
        done()
      })
    })

    it('should use the given text type', done => {
      provider.generate(info, 0, () => {
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.TextType).toBe(testData.opts.type)
        done()
      })
    })

    it('should use the given text part', done => {
      provider.generate(info, 0, () => {
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.Text).toBe(testData.text)
        done()
      })
    })

    it('should not use a language if not specified', done => {
      delete info.opts.language
      provider.generate(info, 0, () => {
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.LanguageCode).toBeUndefined()
        done()
      })
    })

    it('should use the language, when specified', done => {
      provider.generate(info, 0, () => {
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.LanguageCode).toBe(testData.opts.language)
        done()
      })
    })

    it('should use the given voice', done => {
      provider.generate(info, 0, () => {
        let opts = urlCreator.calls.mostRecent().args[0]
        expect(opts.VoiceId).toBe(String(testData.opts.voice))
        done()
      })
    })

    it('should time-limit the request to 30mins', done => {
      provider.generate(info, 0, () => {
        let ttl = urlCreator.calls.mostRecent().args[1]
        expect(ttl).toBe(60 * 30) // eslint-disable-line no-magic-numbers
        done()
      })
    })

    it('should make an HTTP request to the URL from the creator function', done => {
      provider.generate(info, 0, () => {
        expect(got.stream).toHaveBeenCalledWith(testData.url)
        done()
      })
    })
  })
})
