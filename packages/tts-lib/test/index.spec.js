const api = require('../index')

describe('index', () => {
  it('should expose the API', () => {
    expect(api.AwsProvider).toBeDefined()
    expect(api.cleanup).toBeDefined()
    expect(api.combine).toBeDefined()
    expect(api.createManifest).toBeDefined()
    expect(api.createProvider).toBeDefined()
    expect(api.GcpProvider).toBeDefined()
    expect(api.generateAll).toBeDefined()
    expect(api.Provider).toBeDefined()
    expect(api.splitText).toBeDefined()
  })
})
