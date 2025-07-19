const proxyquire = require('proxyquire')

describe('combineEncodedAudio()', () => {
  const binary = 'ffmpeg'
  const manifestFilename = 'manifest.txt'
  const tempFilename = 'foobar.mp3'

  let combineEncodedAudio
  let spawnSpy

  beforeEach(() => {
    const spawnOnSpy = jasmine.createSpy('spawn.on').and.callFake((type, callback) => {
      if (type === 'close') { callback() }
    })
    const spawnStderrOn = jasmine.createSpy('spawn.stderr.on')
    spawnSpy = jasmine.createSpy('spawn').and.callFake(() => {
      return {
        on: spawnOnSpy,
        stderr: {
          on: spawnStderrOn
        }
      }
    })
    spawnSpy.on = spawnOnSpy
    spawnSpy.stderr = {
      on: spawnStderrOn
    }
    ;({ combineEncodedAudio } = proxyquire('../lib/combine-encoded-audio', {
      child_process: {
        spawn: spawnSpy
      }
    }))
  })

  describe('process', () => {
    let cmd, args

    beforeEach(() => {
      combineEncodedAudio(binary, manifestFilename, tempFilename);
      [cmd, args] = spawnSpy.calls.mostRecent().args
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
      spawnSpy.on.and.callFake((type, callback) => {
        if (type === 'error') { callback() }
      })
    })

    it('should return a rejected promise with an error', async () => {
      try {
        await combineEncodedAudio(binary, manifestFilename, tempFilename)
        throw new Error('Expected combineEncodedAudio to throw an error')
      } catch (err) {
        expect(err.message).toMatch('Could not start ffmpeg process')
      }
    })
  })

  describe('when the ffmpeg process fails', () => {
    const errorCode = 42
    const errorOutput = 'foobar'

    beforeEach(() => {
      spawnSpy.on.and.callFake((type, callback) => {
        if (type === 'close') { callback(errorCode) }
      })
      spawnSpy.stderr.on.and.callFake((type, callback) => {
        if (type === 'data') { callback(errorOutput) }
      })
    })

    it('should return a rejected promise with the stderr output', async () => {
      try {
        await combineEncodedAudio(binary, manifestFilename, tempFilename)
        throw new Error('Expected combineEncodedAudio to throw an error')
      } catch (err) {
        expect(err.message).toMatch(`(${errorCode})`)
        expect(err.message).toMatch(`(${errorOutput})`)
      }
    })
  })
})
