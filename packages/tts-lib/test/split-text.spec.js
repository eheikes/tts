const { splitText } = require('../lib/split-text')

describe('splitText()', () => {
  const maxChars = 1000
  const testData = 'hello world'

  it('should split the text into an array of parts', async () => {
    const parts = await splitText(testData, maxChars)
    expect(parts).toEqual([testData])
  })

  it('should split the text by the given number of characters', async () => {
    const parts = await splitText(testData, 2)
    expect(parts).toEqual(['he', 'll', 'o', 'wo', 'rl', 'd'])
  })

  it('should propagate SSML tags through the chunks', async () => {
    const text = '<speak><prosody volume="loud">Hello there<break/> world<break/></prosody></speak>'
    const parts = await splitText(text, 6, 'ssml')
    expect(parts).toEqual([
      '<speak><prosody volume="loud">Hello</prosody></speak>',
      '<speak><prosody volume="loud">there</prosody></speak>',
      '<speak><prosody volume="loud"><break/>world</prosody></speak>'
    ])
  })

  it('should work when SSML tags are duplicated in sequence', async () => {
    const text = '<speak><p>Section 1</p><p>Introduction</p></speak>'
    const parts = await splitText(text, 1500, 'ssml')
    expect(parts).toEqual([
      '<speak><p>Section 1</p></speak>',
      '<speak><p>Introduction</p></speak>'
    ])
  })

  it('should NOT propagate SSML tags for non-SSML text', async () => {
    const text = '<speak>Hello there world</speak>'
    const parts = await splitText(text, 6)
    expect(parts).toEqual([
      '<speak',
      '>Hello',
      'there',
      'world<',
      '/speak',
      '>'
    ])
  })

  it('should condense whitespace', async () => {
    const text = 'hello   world'
    const parts = await splitText(text, maxChars)
    expect(parts).toEqual(['hello world'])
  })

  it('should trim whitespace from the ends', async () => {
    const text = ' hello world '
    const parts = await splitText(text, maxChars)
    expect(parts).toEqual(['hello world'])
  })

  describe('when type is undefined', () => {
    it('should still work', async () => {
      const parts = await splitText(testData, maxChars, undefined)
      expect(parts).toEqual([testData])
    })
  })
})
