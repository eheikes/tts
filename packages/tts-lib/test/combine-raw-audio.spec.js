const proxyquire = require('proxyquire')

describe('combineRawAudio()', () => {
  const manifestFilename = 'manifest.txt'
  const outputFilename = 'foobar.mp3'
  const tempFilenames = ['foo.mp3', 'bar.mp3']

  let combineRawAudio
  let fsSpy

  beforeEach(() => {
    fsSpy = jasmine.createSpyObj('fs', [
      'appendFileSync',
      'createFileSync',
      'readFileSync',
      'truncateSync'
    ])
    ;({ combineRawAudio } = proxyquire('../lib/combine-parts', {
      'fs-extra': fsSpy
    }))
  })

  beforeEach(done => {
    const manifestContents = tempFilenames.map(filename => `file '${filename}'`).join('\n')
    fsSpy.readFileSync.and.callFake(() => manifestContents)
    combineRawAudio(manifestFilename, outputFilename).then(done)
  })

  it('should create the output file and truncate it', () => {
    expect(fsSpy.createFileSync).toHaveBeenCalledWith(outputFilename)
    expect(fsSpy.truncateSync).toHaveBeenCalledWith(outputFilename)
  })

  it('should read and append each file from the manifest', () => {
    tempFilenames.forEach(filename => {
      expect(fsSpy.readFileSync).toHaveBeenCalledWith(filename)
    })
    expect(fsSpy.appendFileSync.calls.count()).toBe(tempFilenames.length)
  })
})
