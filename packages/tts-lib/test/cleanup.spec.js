const proxyquire = require('proxyquire')

describe('cleanup()', () => {
  const manifestFilename = 'manifest.txt'
  const tempFilenames = ['foo.mp3', 'bar.mp3']

  let cleanup
  let fsSpy

  beforeEach(() => {
    fsSpy = jasmine.createSpyObj('fs', ['readFile', 'rm'])
    ;({ cleanup } = proxyquire('../lib/cleanup', {
      'fs/promises': fsSpy
    }))
  })

  beforeEach(() => {
    const manifestContents = tempFilenames.map(filename => `file '${filename}'`).join('\n')
    fsSpy.readFile.and.callFake(() => Promise.resolve(manifestContents))
    return cleanup(manifestFilename)
  })

  it('should delete the manifest file', () => {
    expect(fsSpy.rm).toHaveBeenCalledWith(manifestFilename, { force: true, recursive: true })
  })

  it('should delete the temporary audio files', () => {
    tempFilenames.forEach(filename => {
      expect(fsSpy.rm).toHaveBeenCalledWith(filename, { force: true, recursive: true })
    })
  })
})
