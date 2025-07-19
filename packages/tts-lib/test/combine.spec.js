const proxyquire = require('proxyquire')
const tempfile = require('tempfile')

describe('combine()', () => {
  const testManifest = 'manifest.txt'

  let combine
  let combineEncodedAudioSpy
  let combineRawAudioSpy

  beforeEach(() => {
    combineEncodedAudioSpy = jasmine.createSpy('combineEncodedAudio')
    combineRawAudioSpy = jasmine.createSpy('combineRawAudio')
    ;({ combine } = proxyquire('../lib/combine', {
      './combine-encoded-audio': { combineEncodedAudio: combineEncodedAudioSpy },
      './combine-raw-audio': { combineRawAudio: combineRawAudioSpy }
    }))
  })

  describe('when the format is encoded audio', () => {
    it('should call combineEncodedAudio()', async () => {
      await combine(testManifest, tempfile(), 'encoded', 'ffmpeg-test')
      expect(combineEncodedAudioSpy).toHaveBeenCalledWith('ffmpeg-test', 'manifest.txt', jasmine.any(String))
    })
  })

  describe('when the format is raw', () => {
    it('should call combineRawAudio()', async () => {
      await combine(testManifest, tempfile(), 'raw')
      expect(combineRawAudioSpy).toHaveBeenCalledWith('manifest.txt', jasmine.any(String))
    })
  })

  describe('default format', () => {
    it('should call combineEncodedAudio()', async () => {
      await combine(testManifest, tempfile())
      expect(combineEncodedAudioSpy).toHaveBeenCalledWith('ffmpeg', 'manifest.txt', jasmine.any(String))
    })
  })

  describe('when it succeeds', () => {
    const destFile = tempfile()
    let result

    beforeEach(async () => {
      result = await combine(testManifest, destFile, 'encoded')
    })

    it('should return the new filename', () => {
      expect(result).toBe(destFile)
    })
  })
})
