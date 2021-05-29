import { promises as fs } from 'fs'
import { createManifest } from '../../src/manifest'

describe('createManifest()', () => {
  it('should create a manifest file with the file parts', async () => {
    const parts = [{
      filename: 'foo1.mp3'
    }, {
      filename: 'foo2.mp3'
    }, {
      filename: 'foo3.mp3'
    }]
    const manifest = await createManifest(parts)
    const contents = await fs.readFile(manifest, 'utf8')
    expect(contents).toMatch(/^file 'foo1.mp3'$/m)
    expect(contents).toMatch(/^file 'foo2.mp3'$/m)
    expect(contents).toMatch(/^file 'foo3.mp3'$/m)
  })
})
