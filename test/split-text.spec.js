describe('splitText()', () => {
  const maxChars = 1000
  const testData = 'hello world'

  let splitText
  let ctx

  beforeEach(() => {
    ({ splitText } = require('./helpers').loadLib('split-text'))
    ctx = {
      args: {},
      text: testData,
      maxCharacterCount: maxChars
    }
  })

  it('should split the text into an array of parts', done => {
    splitText(ctx).then(() => {
      expect(ctx.parts).toEqual([testData])
    }).then(done)
  })

  it('should split the text by the given number of characters', done => {
    ctx.maxCharacterCount = 2
    splitText(ctx).then(() => {
      expect(ctx.parts).toEqual(['he', 'll', 'o', 'wo', 'rl', 'd'])
    }).then(done)
  })

  it('should propagate SSML tags through the chunks', done => {
    ctx.text = '<speak><prosody volume="loud">Hello there<break/> world<break/></prosody></speak>'
    ctx.maxCharacterCount = 6
    ctx.args = { type: 'ssml' }
    splitText(ctx).then(() => {
      expect(ctx.parts).toEqual([
        '<speak><prosody volume="loud">Hello</prosody></speak>',
        '<speak><prosody volume="loud">there</prosody></speak>',
        '<speak><prosody volume="loud"><break/>world</prosody></speak>'
      ])
    }).then(done)
  })

  it('should work when SSML tags are duplicated in sequence', done => {
    ctx.text = '<speak><p>Section 1</p><p>Introduction</p></speak>'
    ctx.maxCharacterCount = 1500
    ctx.args = { type: 'ssml' }
    splitText(ctx).then(() => {
      expect(ctx.parts).toEqual([
        '<speak><p>Section 1</p></speak>',
        '<speak><p>Introduction</p></speak>'
      ])
    }).then(done)
  })

  it('should NOT propagate SSML tags for non-SSML text', done => {
    ctx.text = '<speak>Hello there world</speak>'
    ctx.maxCharacterCount = 6
    splitText(ctx).then(() => {
      expect(ctx.parts).toEqual([
        '<speak',
        '>Hello',
        'there',
        'world',
        '</spea',
        'k>'
      ])
    }).then(done)
  })

  it('should condense whitespace', done => {
    ctx.text = 'hello   world'
    splitText(ctx).then(() => {
      expect(ctx.parts).toEqual(['hello world'])
    }).then(done)
  })

  it('should trim whitespace from the ends', done => {
    ctx.text = ' hello world '
    splitText(ctx).then(() => {
      expect(ctx.parts).toEqual(['hello world'])
    }).then(done)
  })
})
