'use strict'
describe('combineEncodedAudio()', () => {
  const binary = 'ffmpeg'
  const manifestFilename = 'manifest.txt'
  const tempFilename = 'foobar.mp3'

  let combineEncodedAudio, ora, spawn

  beforeEach(() => {
    ({ combineEncodedAudio, ora, spawn } = require('./helpers').loadLib())
  })

  describe('process', () => {
    let cmd, args

    beforeEach(() => {
      combineEncodedAudio(binary, manifestFilename, tempFilename);
      [cmd, args] = spawn.calls.mostRecent().args
      args = args.join(' ')
    })

    it('should spawn a ffmpeg process', () => {
      expect(cmd).toBe(binary)
    })

    it('should use the "concat" demuxer', () => {
      expect(args).toMatch(/-f concat/)
    })

    it('should allow any filenames', () => {
      expect(args).toMatch(/-safe 0/)
    })

    it('should use the manifest file', () => {
      expect(args).toMatch(`-i ${manifestFilename}`)
    })

    it('should make a stream copy', () => {
      expect(args).toMatch(/-c copy/)
    })

    it('should copy the result to the temp file', () => {
      expect(args).toMatch(`${tempFilename}$`)
    })
  })

  describe('when the process cannot be spawned', () => {
    beforeEach(() => {
      spawn.on.and.callFake((type, callback) => {
        if (type === 'error') { callback() }
      })
    })

    it('should return a rejected promise with an error', done => {
      combineEncodedAudio(binary, manifestFilename, tempFilename).catch(err => {
        expect(err.message).toMatch('Could not start ffmpeg process')
      }).then(done)
    })
  })

  describe('when the ffmpeg process fails', () => {
    const errorCode = 42
    const errorOutput = 'foobar'

    beforeEach(() => {
      spawn.on.and.callFake((type, callback) => {
        if (type === 'close') { callback(errorCode) }
      })
      spawn.stderr.on.and.callFake((type, callback) => {
        if (type === 'data') { callback(errorOutput) }
      })
    })

    it('should set the spinner to the failure state', done => {
      combineEncodedAudio(binary, manifestFilename, tempFilename).catch(() => {
        expect(ora.fail).toHaveBeenCalled()
      }).then(done)
    })

    it('should return a rejected promise with the stderr output', done => {
      combineEncodedAudio(binary, manifestFilename, tempFilename).catch(err => {
        expect(err.message).toMatch(`(${errorCode})`)
        expect(err.message).toMatch(`(${errorOutput})`)
      }).then(done)
    })
  })

  describe('when the ffmpeg process succeeds', () => {
    it('should set the spinner to the success state', done => {
      combineEncodedAudio(binary, manifestFilename, tempFilename).then(() => {
        expect(ora.succeed).toHaveBeenCalled()
      }).then(done)
    })
  })
})
