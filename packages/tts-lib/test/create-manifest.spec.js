const proxyquire = require('proxyquire')

describe('createManifest()', () => {
  const testParts = [
    { tempfile: 'foo.mp3' },
    { tempfile: 'bar.mp3' }
  ]

  let createManifest
  let fsSpy
  let outputFilename, fileContents, options, lines, response

  beforeEach(() => {
    fsSpy = jasmine.createSpyObj('fs', ['writeFileSync'])
    ;({ createManifest } = proxyquire('../lib/generate-speech', {
      'fs-extra': fsSpy
    }))
  })

  beforeEach(() => {
    response = createManifest(testParts);
    [outputFilename, fileContents, options] = fsSpy.writeFileSync.calls.mostRecent().args
    lines = fileContents.split('\n')
  })

  it('should create a text file', () => {
    expect(outputFilename).toMatch(/\.txt$/)
    expect(options).toBe('utf8')
  })

  it('should have a file entry for each part', () => {
    expect(lines.length).toBe(testParts.length)
  })

  it('should use the correct format', () => {
    lines.forEach((line, i) => {
      expect(line).toMatch(`^file '${testParts[i].tempfile}'$`)
    })
  })

  it('should return the filename', () => {
    expect(response).toBe(outputFilename)
  })
})
