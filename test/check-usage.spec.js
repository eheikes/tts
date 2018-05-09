const { checkUsage } = require('../lib/check-usage')

describe('checkUsage()', () => {
  let returnValue
  let proc, exit, write

  beforeEach(() => {
    returnValue = null
    exit = jasmine.createSpy('process.exit')
    write = jasmine.createSpy('process.stderr.write')
    proc = {
      argv: ['node', 'tts.js'],
      exit: exit,
      stderr: {
        write: write
      }
    }
  })

  describe('when --help is specified', () => {
    beforeEach(() => {
      returnValue = checkUsage({ _: [], help: true }, proc)
    })

    it('should output the usage statement', () => {
      expect(write).toHaveBeenCalled()
    })

    it('should exit without an error', () => {
      expect(exit).toHaveBeenCalledWith(0)
    })
  })

  describe('when 1 argument is passed', () => {
    beforeEach(() => {
      returnValue = checkUsage({ _: ['foo'] }, proc)
    })

    it('should NOT output the usage statement', () => {
      expect(write).not.toHaveBeenCalled()
    })

    it('should NOT exit', () => {
      expect(exit).not.toHaveBeenCalled()
    })
  })

  describe('when no arguments are passed', () => {
    beforeEach(() => {
      returnValue = checkUsage({ _: [] }, proc)
    })

    it('should output the usage statement', () => {
      expect(write).toHaveBeenCalled()
    })

    it('should exit with an error', () => {
      expect(exit).toHaveBeenCalledWith(1)
    })
  })
})
