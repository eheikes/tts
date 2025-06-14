const proxyquire = require('proxyquire')

describe('CLI', () => {
  const inputFile = 'input-file'
  const manifestFile = 'manifest file'
  const outputFile = 'output-file'
  const parts = ['part1', 'part2']
  const tempFile = 'temp file'

  let cli
  let mocks
  let cleanup
  let readText
  let createProvider

  beforeEach(() => {
    process.argv = ['node', 'tts.js', inputFile, outputFile]
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
      fs: {
        readFileSync: () => 'file contents'
      },
      '../tts-lib': { cleanup, createProvider },
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

  describe('when 2 arguments are given', () => {
    const inputFile = 'input-file'

    beforeEach(() => {
      process.argv = ['node', 'tts.js', inputFile, outputFile]
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
      process.argv = ['node', 'tts.js', outputFile]
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
    process.argv = ['node', 'tts.js', outputFile, '--service', 'aws']
    cli = proxyquire('../tts', mocks)
    expect(cli.context.service).toBe('aws')
  })

  it('should create a GCP service', () => {
    process.argv = ['node', 'tts.js', outputFile, '--service', 'gcp']
    cli = proxyquire('../tts', mocks)
    expect(cli.context.service).toBe('gcp')
  })

  it('should create a default service', () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    expect(cli.context.service).toBe('aws')
  })

  it('should create the service with options derived from the CLI arguments', () => {
    process.argv = [
      'node',
      'tts.js',
      inputFile,
      outputFile,
      '--access-key', 'test access key',
      '--effect', 'test effect',
      '--email', 'test email',
      '--engine', 'neural',
      '--ffmpeg', 'test ffmpeg',
      '--format', 'ogg',
      '--gain', '11.13',
      '--gender', 'female',
      '--language', 'test language',
      '--lexicon', 'test lexicon',
      '--pitch', '2.3',
      '--private-key', 'test private key',
      '--project-file', 'test project file',
      '--project-id', 'test project id',
      '--region', 'test region',
      '--sample-rate', '16000',
      '--secret-key', 'test secret key',
      '--service', 'aws',
      '--speed', '2.5',
      '--throttle', '4',
      '--type', 'text',
      '--voice', 'test voice'
    ]
    cli = proxyquire('../tts', mocks)
    expect(createProvider).toHaveBeenCalledWith('aws', {
      accessKey: 'test access key',
      effect: ['test effect'],
      email: 'test email',
      engine: 'neural',
      ffmpeg: 'test ffmpeg',
      format: 'ogg',
      gain: 11.13,
      gender: 'female',
      language: 'test language',
      lexicon: ['test lexicon'],
      pitch: 2.3,
      privateKey: 'test private key',
      projectFile: 'test project file',
      projectId: 'test project id',
      region: 'test region',
      sampleRate: 16000,
      secretKey: 'test secret key',
      service: 'aws',
      speed: 2.5,
      throttle: 4,
      type: 'text',
      voice: 'test voice'
    })
  })

  it('should create the service with default options', () => {
    process.argv = ['node', 'tts.js', inputFile, outputFile]
    cli = proxyquire('../tts', mocks)
    expect(createProvider).toHaveBeenCalledWith('aws', {
      ffmpeg: 'ffmpeg',
      format: 'mp3',
      region: 'us-east-1',
      service: 'aws',
      throttle: 5,
      type: 'text'
    })
  })

  it('should call readText() in the text-reading task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    const context = {}
    await cli.tasks[0].task(context)
    expect(context.text).toBe('test text')
  })

  it('should call splitText() in the text-splitting task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    const context = { text: 'test text' }
    await cli.tasks[1].task(context)
    expect(context.parts).toEqual(parts)
  })

  it('should call generateSpeech() in the speech-generation task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    const context = { parts }
    await cli.tasks[2].task(context, {})
    expect(context.manifestFile).toBe(manifestFile)
  })

  it('should call combineAudio() in the combine-audio task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    const context = { manifestFile }
    await cli.tasks[3].task(context)
    expect(context.tempFile).toBe(tempFile)
  })

  it('should call cleanup() in the cleanup task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    const context = { manifestFile }
    await cli.tasks[4].task(context)
    expect(cleanup).toHaveBeenCalledWith(manifestFile)
  })
})
