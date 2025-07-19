const { createProvider } = require('../lib/create-provider')
const { AwsProvider } = require('../lib/providers/aws')
const { GcpProvider } = require('../lib/providers/gcp')

describe('createProvider()', () => {
  it('should create an AWS provider', () => {
    const provider = createProvider('aws')
    expect(provider).toBeInstanceOf(AwsProvider)
  })

  it('should create a GCP provider', () => {
    const provider = createProvider('gcp')
    expect(provider).toBeInstanceOf(GcpProvider)
  })

  it('should throw an error for an unknown provider', () => {
    expect(() => {
      createProvider('foobar', {})
    }).toThrowError(/Unsupported service: foobar/)
  })
})
