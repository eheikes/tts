import { chunkText, chunkXml } from '../../src/split'

describe('chunkText()', () => {
  const text = 'hello world'

  it('should split the text into an array of parts', async () => {
    expect(await chunkText(text, 1000)).toEqual([text])
  })

  it('should split the text by the given number of characters', async () => {
    expect(await chunkText(text, 2)).toEqual(['he', 'll', 'o', 'wo', 'rl', 'd'])
  })

  it('should NOT propagate SSML tags', async () => {
    const text = '<speak>Hello there world</speak>'
    expect(await chunkText(text, 6)).toEqual([
      '<speak',
      '>Hello',
      'there',
      'world',
      '</spea',
      'k>'
    ])
  })

  it('should condense whitespace', async () => {
    const text = 'hello   world'
    expect(await chunkText(text, 1000)).toEqual(['hello world'])
  })

  it('should trim whitespace from the ends', async () => {
    const text = ' hello world '
    expect(await chunkText(text, 1000)).toEqual(['hello world'])
  })
})

describe('chunkXml()', () => {
  it('should split the text into an array of parts', async () => {
    const text = 'hello world'
    expect(await chunkXml(text, 1000)).toEqual([text])
  })

  it('should propagate SSML tags through the chunks', async () => {
    const text = '<speak><prosody volume="loud">Hello there<break/> world<break/></prosody></speak>'
    expect(await chunkXml(text, 6)).toEqual([
      '<speak><prosody volume="loud">Hello</prosody></speak>',
      '<speak><prosody volume="loud">there</prosody></speak>',
      '<speak><prosody volume="loud"><break/>world</prosody></speak>'
    ])
  })

  it('should work when SSML tags are duplicated in sequence', async () => {
    const text = '<speak><p>Section 1</p><p>Introduction</p></speak>'
    expect(await chunkXml(text, 1500)).toEqual([
      '<speak><p>Section 1</p></speak>',
      '<speak><p>Introduction</p></speak>'
    ])
  })

  it('should condense whitespace', async () => {
    const text = 'hello   world'
    expect(await chunkXml(text, 1000)).toEqual(['hello world'])
  })

  it('should trim whitespace from the ends', async () => {
    const text = ' hello world '
    expect(await chunkXml(text, 1000)).toEqual(['hello world'])
  })
})
