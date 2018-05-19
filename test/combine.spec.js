describe('combine()', () => {
  const testManifest = 'manifest.txt'

  let combine, fs, spawn
  let ctx

  beforeEach(() => {
    ctx = {
      manifestFile: testManifest,
      opts: {
        ffmpeg: 'ffmpeg',
        format: 'mp3'
      }
    }
    const lib = require('./helpers').loadLib('combine-parts')
    combine = lib.combine
    fs = lib.fs
    spawn = lib.spawn
  })

  describe('when the format is MP3', () => {
    it('should call combineEncodedAudio()', () => {
      return combine(ctx).then(() => {
        // We can't spy on combineEncodedAudio() directly, so look at its internals.
        expect(spawn).toHaveBeenCalled()
        expect(spawn.calls.mostRecent().args[0]).toBe(ctx.opts.ffmpeg)
      })
    })
  })

  describe('when the format is PCM', () => {
    it('should call combineRawAudio()', () => {
      ctx.opts.format = 'pcm'
      return combine(ctx).then(() => {
        // We can't spy on combineRawAudio() directly, so look at its internals.
        expect(fs.createFileSync).toHaveBeenCalled()
      })
    })
  })

  describe('when it succeeds', () => {
    beforeEach(() => {
      ctx.opts.format = 'pcm'
      return combine(ctx)
    })

    it('should return the new filename', () => {
      expect(ctx.tempFile).toMatch(/\.pcm$/)
    })
  })

  describe('when it fails', () => {
    let result

    beforeEach(() => {
      spawn.on.and.callFake((type, callback) => {
        if (type === 'error') { callback() }
      })
      return combine(ctx).catch(response => {
        result = response
      })
    })

    it('should return a rejected promise with the error', () => {
      expect(result.message).toMatch('Could not start ffmpeg process')
    })
  })
})
