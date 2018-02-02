'use strict'
describe('callAws()', () => {
  const fs = require('fs')
  const tempfile = require('tempfile')

  let callAws, got, ora
  let testData, info, urlCreator

  beforeEach(() => {
    testData = {
      filename: tempfile(),
      index: 6,
      opts: {
        format: 'ogg',
        lexicon: ['lexicon1', 'lexicon2'],
        'sample-rate': 16000,
        type: 'ssml',
        voice: 'John'
      },
      text: 'hello world',
      url: 'http://example.com/'
    }
    urlCreator = jasmine.createSpy('urlcreator').and.returnValue(testData.url)
    info = {
      opts: testData.opts,
      tempfile: testData.filename,
      text: testData.text,
      urlcreator: urlCreator
    };
    ({ callAws, got, ora } = require('./helpers').loadLib())
  })

  beforeEach(() => {
    ora.text = 'Convert to audio (0/42)'
  })

  afterEach(done => {
    fs.unlink(testData.filename, done)
  })

  it('should update the spinner', done => {
    callAws(info, testData.index, () => {
      expect(ora.text).toMatch(`\\(${testData.index}/`)
      done()
    })
  })

  it('should use the given format', done => {
    callAws(info, 0, () => {
      let opts = urlCreator.calls.mostRecent().args[0]
      expect(opts.OutputFormat).toBe(testData.opts.format)
      done()
    })
  })

  it('should not use sample rate if not specified', done => {
    delete info.opts['sample-rate']
    callAws(info, 0, () => {
      let opts = urlCreator.calls.mostRecent().args[0]
      expect(opts.SampleRate).toBeUndefined()
      done()
    })
  })

  it('should use the (string) sample rate, when specified', done => {
    callAws(info, 0, () => {
      let opts = urlCreator.calls.mostRecent().args[0]
      expect(opts.SampleRate).toBe(String(testData.opts['sample-rate']))
      done()
    })
  })

  it('should not use lexicon names if not specified', done => {
    delete info.opts.lexicon
    callAws(info, 0, () => {
      let opts = urlCreator.calls.mostRecent().args[0]
      expect(opts.LexiconNames).toBeUndefined()
      done()
    })
  })

  it('should use the lexicon names, when specified', done => {
    callAws(info, 0, () => {
      let opts = urlCreator.calls.mostRecent().args[0]
      expect(opts.LexiconNames).toEqual(testData.opts.lexicon)
      done()
    })
  })

  it('should use the given text type', done => {
    callAws(info, 0, () => {
      let opts = urlCreator.calls.mostRecent().args[0]
      expect(opts.TextType).toBe(testData.opts.type)
      done()
    })
  })

  it('should use the given text part', done => {
    callAws(info, 0, () => {
      let opts = urlCreator.calls.mostRecent().args[0]
      expect(opts.Text).toBe(testData.text)
      done()
    })
  })

  it('should use the given voice', done => {
    callAws(info, 0, () => {
      let opts = urlCreator.calls.mostRecent().args[0]
      expect(opts.VoiceId).toBe(String(testData.opts.voice))
      done()
    })
  })

  it('should time-limit the request to 30mins', done => {
    callAws(info, 0, () => {
      let ttl = urlCreator.calls.mostRecent().args[1]
      expect(ttl).toBe(60 * 30) // eslint-disable-line no-magic-numbers
      done()
    })
  })

  it('should make an HTTP request to the URL from the creator function', done => {
    callAws(info, 0, () => {
      expect(got.stream).toHaveBeenCalledWith(testData.url)
      done()
    })
  })
})
