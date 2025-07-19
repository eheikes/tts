const { sanitizeOpts } = require('../../lib/sanitize-opts')
describe('sanitizeOpts()', () => {
  const exampleOpts = {
    foo: 1,
    bar: 2,
    accessKey: 3,
    privateKey: 5,
    secretKey: 4,
    'access-key': 3,
    'secret-key': 4
  }

  let sanitized

  beforeEach(() => {
    sanitized = sanitizeOpts(exampleOpts)
  })

  it('should not change the original options', () => {
    expect(sanitized).not.toBe(exampleOpts)
  })

  it('should sanitize AWS secrets', () => {
    expect(sanitized.accessKey).toMatch(/^X+$/)
    expect(sanitized.secretKey).toMatch(/^X+$/)
    expect(sanitized['access-key']).toMatch(/^X+$/)
    expect(sanitized['secret-key']).toMatch(/^X+$/)
  })

  it('should sanitize GCP secrets', () => {
    expect(sanitized.privateKey).toMatch(/^X+$/)
  })

  it('should not change other keys', () => {
    expect(sanitized.foo).toBe(exampleOpts.foo)
    expect(sanitized.bar).toBe(exampleOpts.bar)
  })
})
