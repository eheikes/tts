describe('generateSpeech()', () => {
  let generateSpeech
  let ctx, task

  beforeEach(() => {
    ({ generateSpeech } = require('./helpers').loadLib('generate-speech'))
    ctx = {
      args: {
        accessKey: 'access key',
        ffmpeg: 'ffmpeg',
        format: 'format',
        lexicon: 'lexicon',
        region: 'region',
        sampleRate: 'sample rate',
        secretKey: 'secret key',
        throttle: '10',
        type: 'type',
        voice: 'voice'
      },
      service: 'aws',
      parts: ['a', 'b', 'c']
    }
    task = { title: 'test task' }
  })

  it('should set context "opts" from the args', () => {
    return generateSpeech(ctx, task).then(() => {
      expect(ctx.opts['access-key']).toBe(ctx.args.accessKey)
      expect(ctx.opts.ffmpeg).toBe(ctx.args.ffmpeg)
      expect(ctx.opts.format).toBe(ctx.args.format)
      expect(ctx.opts.lexicon).toEqual([ctx.args.lexicon])
      expect(ctx.opts.limit).toBe(Number(ctx.args.throttle))
      expect(ctx.opts.region).toBe(ctx.args.region)
      expect(ctx.opts['sample-rate']).toBe(ctx.args.sampleRate)
      expect(ctx.opts['secret-key']).toBe(ctx.args.secretKey)
      expect(ctx.opts.type).toBe(ctx.args.type)
      expect(ctx.opts.voice).toBe(ctx.args.voice)
    })
  })

  it('should have context "opts" fall back to the defaults', () => {
    ctx.args = {}
    return generateSpeech(ctx, task).then(() => {
      expect(ctx.opts['access-key']).toBeUndefined()
      expect(ctx.opts.ffmpeg).toBe('ffmpeg')
      expect(ctx.opts.format).toBe('mp3')
      expect(ctx.opts.lexicon).toBeUndefined()
      expect(ctx.opts.limit).toBe(5)
      expect(ctx.opts.region).toBe('us-east-1')
      expect(ctx.opts['sample-rate']).toBeUndefined()
      expect(ctx.opts['secret-key']).toBeUndefined()
      expect(ctx.opts.type).toBe('text')
      expect(ctx.opts.voice).toBe('Joanna')
    })
  })

  it('should save the manifest file to the context', () => {
    return generateSpeech(ctx, task).then(() => {
      expect(ctx.manifestFile).toEqual(jasmine.any(String))
    })
  })
})
