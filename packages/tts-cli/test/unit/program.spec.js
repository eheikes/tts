const proxyquire = require('proxyquire')
const { program: originalProgram } = require('../../lib/program')

class FakeOption {
  argParser () { return this }
  choices () { return this }
  default () { return this }
  implies () { return this }
}

describe('program', () => {
  it('should be a Commander instance', () => {
    expect(originalProgram).toBeDefined()
    expect(originalProgram.args).toEqual(jasmine.any(Object))
    expect(originalProgram.opts).toEqual(jasmine.any(Function))
    expect(originalProgram.parse).toEqual(jasmine.any(Function))
  })

  it('should exit with an error if there are >2 arguments', () => {
    spyOn(console, 'error')
    const commanderSpy = jasmine.createSpyObj('commander', ['help'])
    let actionFunc
    const commandSpy = jasmine.createSpy('Command').and.returnValue({
      description: () => {},
      version: () => {},
      helpOption: () => {},
      argument: () => {},
      action: (func) => { actionFunc = func },
      addOption: () => {}
    })
    proxyquire('../../lib/program', {
      commander: {
        Command: commandSpy,
        Option: FakeOption
      }
    })
    actionFunc(['file1.txt', 'file2.txt', 'file3.txt'], {}, commanderSpy)

    expect(console.error).toHaveBeenCalledWith('error: too many arguments, expected 1 or 2')
    expect(commanderSpy.help).toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })
})
