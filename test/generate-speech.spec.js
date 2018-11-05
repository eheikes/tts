describe('generateSpeech()', () => {
  let fsStub
  let generateSpeech
  let ctx, task

  beforeEach(() => {
    ({ fs: fsStub, generateSpeech } = require('./helpers').loadLib('generate-speech'))
    ctx = {
      args: {
        accessKey: 'access key',
        email: 'foo@example.com',
        ffmpeg: 'ffmpeg',
        format: 'format',
        lexicon: 'lexicon',
        privateKey: 'private key',
        projectFile: 'project file',
        projectId: 'project ID',
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
      expect(ctx.opts.email).toBe(ctx.args.email)
      expect(ctx.opts.ffmpeg).toBe(ctx.args.ffmpeg)
      expect(ctx.opts.format).toBe(ctx.args.format)
      expect(ctx.opts.lexicon).toEqual([ctx.args.lexicon])
      expect(ctx.opts.limit).toBe(Number(ctx.args.throttle))
      expect(ctx.opts['private-key']).toBe(ctx.args.privateKey)
      expect(ctx.opts['project-file']).toBe(ctx.args.projectFile)
      expect(ctx.opts['project-id']).toBe(ctx.args.projectId)
      expect(ctx.opts.region).toBe(ctx.args.region)
      expect(ctx.opts['sample-rate']).toBe(ctx.args.sampleRate)
      expect(ctx.opts['secret-key']).toBe(ctx.args.secretKey)
      expect(ctx.opts.type).toBe(ctx.args.type)
      expect(ctx.opts.voice).toBe(ctx.args.voice)
    })
  })

  it('should have context "opts" fall back to the (AWS) defaults', () => {
    ctx.args = {}
    ctx.service = 'aws'
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

  it('should have context "opts" fall back to the (GCP) defaults', () => {
    ctx.args = {}
    ctx.service = 'gcp'
    return generateSpeech(ctx, task).then(() => {
      expect(ctx.opts.email).toBeUndefined()
      expect(ctx.opts.ffmpeg).toBe('ffmpeg')
      expect(ctx.opts.format).toBe('mp3')
      expect(ctx.opts.limit).toBe(5)
      expect(ctx.opts['private-key']).toBeUndefined()
      expect(ctx.opts['project-file']).toBeUndefined()
      expect(ctx.opts['project-id']).toBeUndefined()
      expect(ctx.opts['sample-rate']).toBeUndefined()
      expect(ctx.opts.type).toBe('text')
      expect(ctx.opts.voice).toBe('en-US-Standard-C')
    })
  })

  it('should set private-key when private-key-file is specified', () => {
    fsStub.readFileSync.and.returnValue('private key data')
    ctx.args = {
      privateKeyFile: 'foobar.pem'
    }
    return generateSpeech(ctx, task).then(() => {
      expect(fsStub.readFileSync).toHaveBeenCalledWith('foobar.pem', 'utf8')
      expect(ctx.opts['private-key']).toBe('private key data')
    })
  })

  it('should set format to "ogg" when argument is "ogg_vorbis" (AWS)', () => {
    ctx.service = 'aws'
    ctx.args.format = 'ogg_vorbis'
    return generateSpeech(ctx, task).then(() => {
      expect(ctx.opts.format).toBe('ogg')
    })
  })

  it('should save the manifest file to the context', () => {
    return generateSpeech(ctx, task).then(() => {
      expect(ctx.manifestFile).toEqual(jasmine.any(String))
    })
  })
})
