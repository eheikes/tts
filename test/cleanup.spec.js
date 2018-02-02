'use strict'
describe('cleanup()', () => {
  const manifestFilename = 'manifest.txt'
  const tempFilenames = ['foo.mp3', 'bar.mp3']

  let cleanup, fs

  beforeEach(() => {
    ({ cleanup, fs } = require('./helpers').loadLib())
  })

  beforeEach(() => {
    const manifestContents = tempFilenames.map(filename => `file '${filename}'`).join('\n')
    fs.readFileSync.and.callFake(() => manifestContents)
    cleanup(manifestFilename)
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
