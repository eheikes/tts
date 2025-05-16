const proxyquire = require('proxyquire')

describe('CLI', () => {
  const inputFile = 'input-file'
  const manifestFile = 'manifest file'
  const outputFile = 'output-file'
  const parts = ['part1', 'part2']
  const tempFile = 'temp file'

  let cli
  let args
  let mocks
  let minimist
  let cleanup
  let readText
  let createProvider

  beforeEach(() => {
    args = { _: [inputFile, outputFile] }
    minimist = jasmine.createSpy('minimist').and.callFake(() => args)
    cleanup = jasmine.createSpy('cleanup')
    readText = jasmine.createSpy('readText').and.returnValue('test text')
    createProvider = jasmine.createSpy('createProvider').and.returnValue({
      combineAudio: () => {
        return Promise.resolve(tempFile)
      },
      generateSpeech: () => {
        return Promise.resolve(manifestFile)
      },
      splitText: () => {
        return Promise.resolve(parts)
      }
    })
    mocks = {
      'fs': {
        readFileSync: () => 'file contents'
      },
      minimist,
      '../tts-lib/lib/cleanup': { cleanup },
      '../tts-lib/lib/provider': {
        createProvider
      },
      './lib/read-text': { readText }
    }
    cli = proxyquire('../tts', mocks)
  })

  it('should construct an array of tasks', () => {
    expect(cli.tasks).toEqual(jasmine.any(Array))
    expect(cli.tasks.every(task => {
      return typeof task.title === 'string' && typeof task.task === 'function'
    })).toBe(true)
  })

  it('should pass the CLI arguments to Listr', () => {
    expect(cli.context.args).toBe(args)
  })

  describe('when 2 arguments are given', () => {
    const inputFile = 'input-file'

    beforeEach(() => {
      args = { _: [inputFile, outputFile] }
      cli = proxyquire('../tts', mocks)
    })

    it('should use the first argument for the input filename', () => {
      expect(cli.context.input).toBe(inputFile)
    })

    it('should use the second argument for the output filename', () => {
      expect(cli.context.outputFilename).toBe(outputFile)
    })
  })

  describe('when only 1 argument is given', () => {
    beforeEach(() => {
      args = { _: [outputFile] }
      cli = proxyquire('../tts', mocks)
    })

    it('should use null for the input filename', () => {
      expect(cli.context.input).toBe(null)
    })

    it('should use the first argument for the output filename', () => {
      expect(cli.context.outputFilename).toBe(outputFile)
    })
  })

  it('should create an AWS service', () => {
    args = { _: [outputFile], service: 'aws' }
    cli = proxyquire('../tts', mocks)
    expect(cli.context.service).toBe('aws')
  })

  it('should create a GCP service', () => {
    args = { _: [outputFile], service: 'gcp' }
    cli = proxyquire('../tts', mocks)
    expect(cli.context.service).toBe('gcp')
  })

  it('should create a default service', () => {
    args = { _: [outputFile] }
    cli = proxyquire('../tts', mocks)
    expect(cli.context.service).toBe('aws')
  })

  it('should create the service with options derived from the CLI arguments', () => {
    createProvider.calls.reset()
    args = {
      _: [outputFile],
      'access-key': 'test access key',
      effect: 'test effect',
      email: 'test email',
      engine: 'test engine',
      ffmpeg: 'test ffmpeg',
      format: 'test format',
      gain: '11.13',
      gender: 'test gender',
      language: 'test language',
      lexicon: 'test lexicon',
      pitch: '2.3',
      'private-key': 'test private key',
      'project-file': 'test project file',
      'project-id': 'test project id',
      region: 'test region',
      'sample-rate': '16000',
      'secret-key': 'test secret key',
      service: 'aws',
      speed: '2.5',
      throttle: '4',
      type: 'test type',
      voice: 'test voice'
    }
    cli = proxyquire('../tts', mocks)
    expect(createProvider).toHaveBeenCalledWith('aws', {
      accessKey: 'test access key',
      effect: ['test effect'],
      email: 'test email',
      engine: 'test engine',
      ffmpeg: 'test ffmpeg',
      format: 'test format',
      gain: 11.13,
      gender: 'test gender',
      language: 'test language',
      lexicon: ['test lexicon'],
      limit: 4,
      pitch: 2.3,
      privateKey: 'test private key',
      projectFile: 'test project file',
      projectId: 'test project id',
      region: 'test region',
      sampleRate: 16000,
      secretKey: 'test secret key',
      speed: 2.5,
      type: 'test type',
      voice: 'test voice'
    })
  })

  it('should create the service with default options', () => {
    createProvider.calls.reset()
    args = { _: [outputFile] }
    cli = proxyquire('../tts', mocks)
    expect(createProvider).toHaveBeenCalledWith('aws', {
      accessKey: undefined,
      effect: undefined,
      email: undefined,
      engine: undefined,
      ffmpeg: 'ffmpeg',
      format: 'mp3',
      gain: undefined,
      gender: undefined,
      language: undefined,
      lexicon: undefined,
      limit: 5,
      pitch: undefined,
      privateKey: undefined,
      projectFile: undefined,
      projectId: undefined,
      region: 'us-east-1',
      sampleRate: undefined,
      secretKey: undefined,
      speed: undefined,
      type: 'text',
      voice: undefined
    })
  })

  it('should use private key in private key file', () => {
    createProvider.calls.reset()
    args = { _: [outputFile], 'private-key-file': 'foobar' }
    cli = proxyquire('../tts', mocks)
    const opts = createProvider.calls.mostRecent().args[1]
    expect(opts.privateKey).toBe('file contents')
  })

  it('should call readText() in the text-reading task', async () => {
    args = { _: [outputFile] }
    cli = proxyquire('../tts', mocks)
    const context = {}
    await cli.tasks[0].task(context)
    expect(context.text).toBe('test text')
  })

  it('should call splitText() in the text-splitting task', async () => {
    args = { _: [outputFile] }
    cli = proxyquire('../tts', mocks)
    const context = { text: 'test text' }
    await cli.tasks[1].task(context)
    expect(context.parts).toEqual(parts)
  })

  it('should call generateSpeech() in the speech-generation task', async () => {
    args = { _: [outputFile] }
    cli = proxyquire('../tts', mocks)
    const context = { parts }
    await cli.tasks[2].task(context, {})
    expect(context.manifestFile).toBe(manifestFile)
  })

  it('should call combineAudio() in the combine-audio task', async () => {
    args = { _: [outputFile] }
    cli = proxyquire('../tts', mocks)
    const context = { manifestFile }
    await cli.tasks[3].task(context)
    expect(context.tempFile).toBe(tempFile)
  })

  it('should call cleanup() in the cleanup task', async () => {
    args = { _: [outputFile] }
    cli = proxyquire('../tts', mocks)
    const context = { manifestFile }
    await cli.tasks[4].task(context)
    expect(cleanup).toHaveBeenCalledWith(manifestFile)
  })
})
