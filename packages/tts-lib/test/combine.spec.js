const tempfile = require('tempfile')
const lib = require('../lib/combine-parts')

describe('combine()', () => {
  const testManifest = 'manifest.txt'

  let combine

  beforeEach(() => {
    combine = lib.combine
    spyOn(lib, 'combineEncodedAudio')
    spyOn(lib, 'combineRawAudio')
  })

  describe('when the format is encoded audio', () => {
    it('should call combineEncodedAudio()', () => {
      return combine(testManifest, tempfile(), 'encoded', 'ffmpeg-test').then(() => {
        expect(lib.combineEncodedAudio).toHaveBeenCalledWith('ffmpeg-test', 'manifest.txt', jasmine.any(String))
      })
    })
  })

  describe('when the format is raw', () => {
    it('should call combineRawAudio()', () => {
      return combine(testManifest, tempfile(), 'raw').then(() => {
        expect(lib.combineRawAudio).toHaveBeenCalledWith('manifest.txt', jasmine.any(String))
      })
    })
  })

  describe('default format', () => {
    it('should call combineEncodedAudio()', () => {
      return combine(testManifest, tempfile()).then(() => {
        expect(lib.combineEncodedAudio).toHaveBeenCalledWith('ffmpeg', 'manifest.txt', jasmine.any(String))
      })
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
