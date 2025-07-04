const EventEmitter = require('events')
const proxyquire = require('proxyquire')

class TestEmitter extends EventEmitter {}

describe('CLI', () => {
  const inputFile = 'input-file'
  const outputFile = 'output-file'
  const tempFile = 'temp file'

  let cli
  let mocks
  let cleanup
  let convert
  let readText
  let createProvider
  let emitter

  beforeEach(() => {
    process.argv = ['node', 'tts.js', inputFile, outputFile]
    emitter = new TestEmitter()
    cleanup = jasmine.createSpy('cleanup')
    convert = jasmine.createSpy('convert').and.returnValue(Promise.resolve(tempFile))
    readText = jasmine.createSpy('readText').and.returnValue('test text')
    createProvider = jasmine.createSpy('createProvider').and.returnValue({
      convert,
      events: emitter
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
    await cli.tasks[0].task()
    expect(readText).toHaveBeenCalledWith(null, process)
  })

  it('should call convert() in the text-reading task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    await cli.tasks[0].task()
    expect(convert).toHaveBeenCalledWith('test text')
  })

  it('should listen for the "split" event in the text-splitting task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    const context = {}
    emitter.emit('split', { count: 6 })
    await cli.tasks[1].task(context) // will timeout with no split event
  })

  it('should set "count" in the context in the text-splitting task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    const context = {}
    emitter.emit('split', { count: 6 })
    await cli.tasks[1].task(context)
    expect(context.count).toBe(6)
  })

  it('should listen for the "manifest" event in the speech-generation task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    const context = { count: 6 }
    const task = {}
    emitter.emit('manifest', { complete: 2, count: 6 })
    await cli.tasks[2].task(context, task) // will timeout with no manifest event
  })

  it('should set the initial task title in the speech-generation task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    const context = { count: 6 }
    const task = {}
    emitter.emit('manifest')
    await cli.tasks[2].task(context, task)
    expect(task.title).toBe('Convert to audio (0/6)')
  })

  it('should update the task title on "generate" events', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    const context = { count: 6 }
    const task = {}
    const doneWithTask = cli.tasks[2].task(context, task)
    emitter.emit('generate', { complete: 2, count: 6 })
    emitter.emit('manifest')
    await doneWithTask
    expect(task.title).toBe('Convert to audio (2/6)')
  })

  it('should listen for the "save" event in the combine-audio task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    const context = {}
    emitter.emit('save', { filename: outputFile })
    await cli.tasks[3].task(context) // will timeout with no save event
  })

  it('should set "tempFile" in the context in the combine-audio task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    const context = {}
    emitter.emit('save', { filename: outputFile })
    await cli.tasks[3].task(context)
    expect(context.tempFile).toBe(outputFile)
  })

  it('should listen for the "clean" event in the cleanup task', async () => {
    process.argv = ['node', 'tts.js', outputFile]
    cli = proxyquire('../tts', mocks)
    emitter.emit('clean')
    await cli.tasks[4].task() // will timeout with no clean event
  })
})
