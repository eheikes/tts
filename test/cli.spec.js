const proxyquire = require('proxyquire')

describe('CLI', () => {
  const outputFile = 'output-file'

  let cli
  let args, minimist

  beforeEach(() => {
    args = { _: [outputFile] }
    minimist = jasmine.createSpy('minimist').and.callFake(() => args)
    cli = proxyquire('../tts', { minimist })
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

  it('should pass the max character count to Listr', () => {
    expect(cli.context.maxCharacterCount).toEqual(jasmine.any(Number))
  })

  it('should pass the process object to Listr', () => {
    expect(cli.context.process).toEqual(jasmine.any(Object))
    expect(cli.context.process.argv).toEqual(jasmine.any(Array))
  })

  describe('when 2 arguments are given', () => {
    const inputFile = 'input-file'

    beforeEach(() => {
      args = { _: [inputFile, outputFile] }
      cli = proxyquire('../tts', { minimist })
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
      cli = proxyquire('../tts', { minimist })
    })

    it('should use null for the input filename', () => {
      expect(cli.context.input).toBe(null)
    })

    it('should use the first argument for the output filename', () => {
      expect(cli.context.outputFilename).toBe(outputFile)
    })
  })

  describe('when the "aws" service is specified', () => {
    beforeEach(() => {
      args = { _: [outputFile], service: 'aws' }
      cli = proxyquire('../tts', { minimist })
    })

    it('should save that as the service', () => {
      expect(cli.context.service).toBe('aws')
    })
  })

  describe('when the "gcp" service is specified', () => {
    beforeEach(() => {
      args = { _: [outputFile], service: 'gcp' }
      cli = proxyquire('../tts', { minimist })
    })

    it('should save that as the service', () => {
      expect(cli.context.service).toBe('gcp')
    })
  })

  describe('when no service is specified', () => {
    beforeEach(() => {
      args = { _: [outputFile] }
      cli = proxyquire('../tts', { minimist })
    })

    it('should use the default service', () => {
      expect(cli.context.service).toBe('aws')
    })
  })
})
