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
    expect(cli.opts.args).toBe(args)
  })

  it('should pass the max character count to Listr', () => {
    expect(cli.opts.maxCharacterCount).toEqual(jasmine.any(Number))
  })

  it('should pass the process object to Listr', () => {
    expect(cli.opts.process).toEqual(jasmine.any(Object))
    expect(cli.opts.process.argv).toEqual(jasmine.any(Array))
  })

  describe('when 2 arguments are given', () => {
    const inputFile = 'input-file'

    beforeEach(() => {
      args = { _: [inputFile, outputFile] }
      cli = proxyquire('../tts', { minimist })
    })

    it('should use the first argument for the input filename', () => {
      expect(cli.opts.input).toBe(inputFile)
    })

    it('should use the second argument for the output filename', () => {
      expect(cli.opts.outputFilename).toBe(outputFile)
    })
  })

  describe('when only 1 argument is given', () => {
    beforeEach(() => {
      args = { _: [outputFile] }
      cli = proxyquire('../tts', { minimist })
    })

    it('should use null for the input filename', () => {
      expect(cli.opts.input).toBe(null)
    })

    it('should use the first argument for the output filename', () => {
      expect(cli.opts.outputFilename).toBe(outputFile)
    })
  })
})
