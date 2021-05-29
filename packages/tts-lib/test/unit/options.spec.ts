import { sanitizeOptions, SpeechOptions } from '../../src/options'

describe('sanitizeOptions()', () => {
  const opts: SpeechOptions = {
    accessKey: 'access key',
    format: 'mp3',
    privateKey: 'private key',
    secretKey: 'secret key',
    voice: 'Steven'
  }

  it('should replace secret values', () => {
    const result = sanitizeOptions(opts)
    expect(result.accessKey).toBe('XXXXXXXX')
    expect(result.privateKey).toBe('XXXXXXXX')
    expect(result.secretKey).toBe('XXXXXXXX')
  })

  it('should not change other values', () => {
    const result = sanitizeOptions(opts)
    expect(result.format).toBe('mp3')
    expect(result.voice).toBe('Steven')
  })
})
