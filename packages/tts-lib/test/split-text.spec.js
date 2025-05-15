const { splitText } = require('../lib/split-text')

describe('splitText()', () => {
  const maxChars = 1000
  const testData = 'hello world'

  it('should split the text into an array of parts', done => {
    splitText(testData, maxChars).then((parts) => {
      expect(parts).toEqual([testData])
    }).then(done)
  })

  it('should split the text by the given number of characters', done => {
    splitText(testData, 2).then((parts) => {
      expect(parts).toEqual(['he', 'll', 'o', 'wo', 'rl', 'd'])
    }).then(done)
  })

  it('should propagate SSML tags through the chunks', done => {
    const text = '<speak><prosody volume="loud">Hello there<break/> world<break/></prosody></speak>'
    splitText(text, 6, 'ssml').then((parts) => {
      expect(parts).toEqual([
        '<speak><prosody volume="loud">Hello</prosody></speak>',
        '<speak><prosody volume="loud">there</prosody></speak>',
        '<speak><prosody volume="loud"><break/>world</prosody></speak>'
      ])
    }).then(done)
  })

  it('should work when SSML tags are duplicated in sequence', done => {
    const text = '<speak><p>Section 1</p><p>Introduction</p></speak>'
    splitText(text, 1500, 'ssml').then((parts) => {
      expect(parts).toEqual([
        '<speak><p>Section 1</p></speak>',
        '<speak><p>Introduction</p></speak>'
      ])
    }).then(done)
  })

  it('should NOT propagate SSML tags for non-SSML text', done => {
    const text = '<speak>Hello there world</speak>'
    splitText(text, 6).then((parts) => {
      expect(parts).toEqual([
        '<speak',
        '>Hello',
        'there',
        'world<',
        '/speak',
        '>'
      ])
    }).then(done)
  })

  it('should condense whitespace', done => {
    const text = 'hello   world'
    splitText(text, maxChars).then((parts) => {
      expect(parts).toEqual(['hello world'])
    }).then(done)
  })

  it('should trim whitespace from the ends', done => {
    const text = ' hello world '
    splitText(text, maxChars).then((parts) => {
      expect(parts).toEqual(['hello world'])
    }).then(done)
  })

  describe('when type is undefined', () => {
    it('should still work', () => {
      return splitText(testData, maxChars, undefined).then((parts) => {
        expect(parts).toEqual([testData])
      })
    })
  })
})
