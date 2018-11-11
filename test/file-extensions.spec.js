const { extensionFor } = require('../lib/file-extensions')

describe('extensionFor()', () => {
  it('should return "mp3" for the MP3 format', () => {
    expect(extensionFor('mp3', 'aws')).toBe('mp3')
    expect(extensionFor('mp3', 'gcp')).toBe('mp3')
  })

  it('should return "ogg" for the Ogg format', () => {
    expect(extensionFor('ogg', 'aws')).toBe('ogg')
    expect(extensionFor('ogg', 'gcp')).toBe('ogg')
  })

  it('should return "ogg" for the (deprecated) Ogg Vorbis format', () => {
    expect(extensionFor('ogg_vorbis', 'aws')).toBe('ogg')
  })

  it('should return "pcm" for the PCM format on AWS', () => {
    expect(extensionFor('pcm', 'aws')).toBe('pcm')
  })

  it('should return "wav" for the PCM format on GCP', () => {
    expect(extensionFor('pcm', 'gcp')).toBe('wav')
  })

  it('should throw an error for unknown formats', () => {
    expect(() => {
      extensionFor('foo', 'aws')
    }).toThrow()
  })
})
