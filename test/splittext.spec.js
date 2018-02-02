'use strict'
describe('splitText()', () => {
  const maxChars = 1000
  const testData = 'hello world'

  let splitText, ora

  beforeEach(() => {
    ({ splitText, ora } = require('./helpers').loadLib())
  })

  it('should update the spinner', done => {
    splitText(testData, maxChars).then(() => {
      expect(ora.start).toHaveBeenCalled()
      expect(ora.text).toMatch('Splitting text')
    }).then(done)
  })

  it('should split the text into an array of parts', done => {
    splitText(testData, maxChars).then(text => {
      expect(text).toEqual([testData])
    }).then(done)
  })

  it('should split the text by the given number of characters', done => {
    const testSize = 2
    splitText(testData, testSize).then(text => {
      expect(text).toEqual(['he', 'll', 'o', 'wo', 'rl', 'd'])
    }).then(done)
  })

  it('should propagate SSML tags through the chunks', done => {
    const testSsml = '<speak><prosody volume="loud">Hello there<break/> world<break/></prosody></speak>'
    const testSize = 6
    splitText(testSsml, testSize, { type: 'ssml' }).then(text => {
      expect(text).toEqual([
        '<speak><prosody volume="loud">Hello</prosody></speak>',
        '<speak><prosody volume="loud">there</prosody></speak>',
        '<speak><prosody volume="loud"><break></break>world</prosody></speak>'
      ])
    }).then(done)
  })

  it('should NOT propagate SSML tags for non-SSML text', done => {
    const testSsml = '<speak>Hello there world</speak>'
    const testSize = 6
    splitText(testSsml, testSize).then(text => {
      expect(text).toEqual([
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
    splitText('hello   world', maxChars).then(text => {
      expect(text).toEqual(['hello world'])
    }).then(done)
  })

  it('should trim whitespace from the ends', done => {
    splitText(' hello world ', maxChars).then(text => {
      expect(text).toEqual(['hello world'])
    }).then(done)
  })

  it('should show the spinner success state', done => {
    splitText(testData, maxChars).then(() => {
      expect(ora.succeed).toHaveBeenCalled()
    }).then(done)
  })
})
