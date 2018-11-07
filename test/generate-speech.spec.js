describe('generateSpeech()', () => {
  let fsStub
  let generateSpeech
  let ctx, task

  beforeEach(() => {
    ({ fs: fsStub, generateSpeech } = require('./helpers').loadLib('generate-speech'))
    ctx = {
      args: {
        'access-key': 'access key',
        email: 'foo@example.com',
        ffmpeg: 'ffmpeg',
        format: 'mp3',
        language: 'ab-CD',
        lexicon: 'lexicon',
        'private-key': 'private key',
        'project-file': 'project file',
        'project-id': 'project ID',
        region: 'region',
        'sample-rate': 'sample rate',
        'secret-key': 'secret key',
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
      expect(ctx.opts.accessKey).toBe(ctx.args['access-key'])
      expect(ctx.opts.email).toBe(ctx.args.email)
      expect(ctx.opts.ffmpeg).toBe(ctx.args.ffmpeg)
      expect(ctx.opts.format).toBe(ctx.args.format)
      expect(ctx.opts.language).toBe(ctx.args.language)
      expect(ctx.opts.lexicon).toEqual([ctx.args.lexicon])
      expect(ctx.opts.limit).toBe(Number(ctx.args.throttle))
      expect(ctx.opts.privateKey).toBe(ctx.args['private-key'])
      expect(ctx.opts.projectFile).toBe(ctx.args['project-file'])
      expect(ctx.opts.projectId).toBe(ctx.args['project-id'])
      expect(ctx.opts.region).toBe(ctx.args.region)
      expect(ctx.opts.sampleRate).toBe(ctx.args['sample-rate'])
      expect(ctx.opts.secretKey).toBe(ctx.args['secret-key'])
      expect(ctx.opts.type).toBe(ctx.args.type)
      expect(ctx.opts.voice).toBe(ctx.args.voice)
    })
  })

  it('should have context "opts" fall back to the (AWS) defaults', () => {
    ctx.args = {}
    ctx.service = 'aws'
    return generateSpeech(ctx, task).then(() => {
      expect(ctx.opts.accessKey).toBeUndefined()
      expect(ctx.opts.ffmpeg).toBe('ffmpeg')
      expect(ctx.opts.format).toBe('mp3')
      expect(ctx.opts.language).toBeUndefined()
      expect(ctx.opts.lexicon).toBeUndefined()
      expect(ctx.opts.limit).toBe(5)
      expect(ctx.opts.region).toBe('us-east-1')
      expect(ctx.opts.sampleRate).toBeUndefined()
      expect(ctx.opts.secretKey).toBeUndefined()
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
      expect(ctx.opts.language).toBe('en-US')
      expect(ctx.opts.limit).toBe(5)
      expect(ctx.opts.privateKey).toBeUndefined()
      expect(ctx.opts.projectFile).toBeUndefined()
      expect(ctx.opts.projectId).toBeUndefined()
      expect(ctx.opts.sampleRate).toBeUndefined()
      expect(ctx.opts.type).toBe('text')
      expect(ctx.opts.voice).toBeUndefined()
    })
  })

  it('should set private-key when private-key-file is specified', () => {
    fsStub.readFileSync.and.returnValue('private key data')
    ctx.args = {
      'private-key-file': 'foobar.pem'
    }
    return generateSpeech(ctx, task).then(() => {
      expect(fsStub.readFileSync).toHaveBeenCalledWith('foobar.pem', 'utf8')
      expect(ctx.opts.privateKey).toBe('private key data')
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
