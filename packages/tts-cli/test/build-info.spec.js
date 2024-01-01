describe('buildInfo()', () => {
  const task = {}
  const text = 'foobar'
  const format = 'mp3'
  const instance = { foo: 1, bar: 2 }
  const ctx = {
    opts: { format }
  }

  let buildInfo, output

  beforeEach(() => {
    ({ buildInfo } = require('./helpers').loadLib('generate-speech'))
    output = buildInfo(text, { buildPart: () => instance }, task, ctx)
  })

  it('should return an object', () => {
    expect(output).toEqual(jasmine.any(Object))
  })

  it('should have an "opts" property with the original options', () => {
    expect(output.opts).toEqual(ctx.opts)
  })

  it('should have a "task" property', () => {
    expect(output.task).toEqual(task)
  })

  it('should have a "tempfile" property', () => {
    expect(output.tempfile).toEqual(jasmine.any(String))
  })

  it('should have an appropriate file extension for the tempfile', () => {
    expect(output.tempfile).toMatch(`\\.${format}$`)
  })

  it('should have a "text" property with the original text', () => {
    expect(output.text).toBe(text)
  })

  it('should add in the instance\'s properties', () => {
    expect(output.foo).toBe(instance.foo)
    expect(output.bar).toBe(instance.bar)
  })
})
