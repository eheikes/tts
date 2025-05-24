const proxyquire = require('proxyquire')

describe('combineRawAudio()', () => {
  const manifestFilename = 'manifest.txt'
  const outputFilename = 'foobar.mp3'
  const tempFilenames = ['foo.mp3', 'bar.mp3']

  let combineRawAudio
  let fsSpy

  beforeEach(() => {
    fsSpy = jasmine.createSpyObj('fs', [
      'appendFile',
      'readFile',
      'writeFile'
    ])
    ;({ combineRawAudio } = proxyquire('../lib/combine-parts', {
      'fs/promises': fsSpy
    }))
  })

  beforeEach(done => {
    const manifestContents = tempFilenames.map(filename => `file '${filename}'`).join('\n')
    fsSpy.readFile.and.callFake(() => Promise.resolve(manifestContents))
    combineRawAudio(manifestFilename, outputFilename).then(done)
  })

  it('should create the output file and truncate it', () => {
    expect(fsSpy.writeFile).toHaveBeenCalledWith(outputFilename, '')
  })

  it('should read and append each file from the manifest', () => {
    tempFilenames.forEach(filename => {
      expect(fsSpy.readFile).toHaveBeenCalledWith(filename)
    })
    expect(fsSpy.appendFile.calls.count()).toBe(tempFilenames.length)
  })
})
