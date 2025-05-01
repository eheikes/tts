const tempfile = require('tempfile')

describe('combine()', () => {
  const testManifest = 'manifest.txt'

  let combine, fs, spawn

  beforeEach(() => {
    const lib = require('./helpers').loadLib('combine-parts')
    combine = lib.combine
    fs = lib.fs
    spawn = lib.spawn
  })

  describe('when the format is encoded audio', () => {
    it('should call combineEncodedAudio()', () => {
      return combine(testManifest, tempfile(), 'encoded', 'ffmpeg-test').then(() => {
        // We can't spy on combineEncodedAudio() directly, so look at its internals. // TODO is this true?
        expect(spawn).toHaveBeenCalled()
        expect(spawn.calls.mostRecent().args[0]).toBe('ffmpeg-test')
      })
    })
  })

  describe('when the format is raw', () => {
    it('should call combineRawAudio()', () => {
      return combine(testManifest, tempfile(), 'raw').then(() => {
        // We can't spy on combineRawAudio() directly, so look at its internals. // TODO is this true?
        expect(fs.createFileSync).toHaveBeenCalled()
      })
    })
  })

  describe('default format', () => {
    it('should call combineEncodedAudio()', () => {
      return combine(testManifest, tempfile()).then(() => {
        // We can't spy on combineEncodedAudio() directly, so look at its internals. // TODO is this true?
        expect(spawn).toHaveBeenCalled()
        expect(spawn.calls.mostRecent().args[0]).toBe('ffmpeg')
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

  describe('when it fails', () => {
    let result

    beforeEach(() => {
      spawn.on.and.callFake((type, callback) => {
        if (type === 'error') { callback() }
      })
      return combine(testManifest, tempfile(), 'encoded').catch(response => {
        result = response
      })
    })

    it('should return a rejected promise with the error', () => {
      expect(result.message).toMatch('Could not start ffmpeg process')
    })
  })
})
