describe('cleanup()', () => {
  const manifestFilename = 'manifest.txt'
  const tempFilenames = ['foo.mp3', 'bar.mp3']

  let cleanup, fs
  let ctx

  beforeEach(() => {
    ({ cleanup, fs } = require('./helpers').loadLib('cleanup'))
    ctx = {
      manifestFile: manifestFilename
    }
  })

  beforeEach(() => {
    const manifestContents = tempFilenames.map(filename => `file '${filename}'`).join('\n')
    fs.readFileSync.and.callFake(() => manifestContents)
    return cleanup(ctx)
  })

  it('should delete the manifest file', () => {
    expect(fs.removeSync).toHaveBeenCalledWith(manifestFilename)
  })

  it('should delete the temporary audio files', () => {
    tempFilenames.forEach(filename => {
      expect(fs.removeSync).toHaveBeenCalledWith(filename)
    })
  })
})
