describe('buildInfo()', () => {
  const text = 'foobar'
  const format = 'mp3'
  const func = function () {}
  const opts = { format }

  let buildInfo, output

  beforeEach(() => {
    ({ buildInfo } = require('./helpers').loadLib('generate-speech'))
    output = buildInfo(text, func, opts)
  })

  it('should return an object', () => {
    expect(output).toEqual(jasmine.any(Object))
  })

  it('should have an "opts" property with the original options', () => {
    expect(output.opts).toEqual(opts)
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

  it('should have a "urlcreator" property', () => {
    expect(output.urlcreator).toEqual(jasmine.any(Function))
  })
})
