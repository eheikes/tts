import * as main from '../../src'

describe('top-level module', () => {
  it('should have the expected named exports', () => {
    expect(main.createSpeechStream).toBeDefined()
    expect(main.generateSpeech).toBeDefined()
  })
})
