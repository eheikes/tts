import { ChildProcessWithoutNullStreams, spawn, SpawnOptionsWithoutStdio } from 'child_process'
import { promises as fs } from 'fs'
import { Readable } from 'stream'
import * as tempy from 'tempy'
import { combineEncodedAudio, combineRawAudio } from '../../src/combine'

jest.mock('child_process')

describe('combineEncodedAudio()', () => {
  type SpawnType = (command: string, args?: ReadonlyArray<string>, options?: SpawnOptionsWithoutStdio) => ChildProcessWithoutNullStreams // specify the exact call for TS
  const mockSpawn = spawn as unknown as jest.MockedFunction<SpawnType>
  let stream: Readable

  beforeEach(() => {
    stream = new Readable({
      read() {}
    })
    const process = Object.create(stream) as ChildProcessWithoutNullStreams
    process.stderr = new Readable({
      read() {}
    })
    mockSpawn.mockReturnValue(process)
  })

  it('should call ffmpeg with the appropriate arguments', async () => {
    const promise = combineEncodedAudio('/foo/ffmpeg', '/foo/manifest', '/foo/output')
    stream.emit('close', 0)
    await promise
    expect(mockSpawn).toHaveBeenCalledWith(
      '/foo/ffmpeg',
      [
        '-f', 'concat',
        '-safe', '0',
        '-i', '/foo/manifest',
        '-c', 'copy',
        '/foo/output'
      ]
    )
  })

  it(`should throw an error if the ffmpeg process can't start`, async () => {
    const promise = combineEncodedAudio('/foo/ffmpeg', '/foo/manifest', '/foo/output')
    try {
      stream.emit('error', new Error('test error'))
      await promise
      throw new Error('should have thrown an error')
    } catch (err) {
      expect(err.message).toBe('Could not start ffmpeg process')
    }
  })

  it(`should throw an error if the ffmpeg command doesn't work`, async () => {
    const promise = combineEncodedAudio('/foo/ffmpeg', '/foo/manifest', '/foo/output')
    try {
      stream.emit('close', 99)
      await promise
      throw new Error('should have thrown an error')
    } catch (err) {
      expect(err.message).toBe('ffmpeg returned an error (99): ')
    }
  })
})

describe('combineRawAudio', () => {
  it('should combine files in manifest into one file', async () => {
    const source1 = tempy.file()
    const source2 = tempy.file()
    const source3 = tempy.file()
    const manifest = tempy.file()
    const output = tempy.file()

    await Promise.all([
      fs.writeFile(source1, 'foo', 'utf8'),
      fs.writeFile(source2, 'bar', 'utf8'),
      fs.writeFile(source3, 'baz', 'utf8'),
      fs.writeFile(manifest, [
        `file '${source1}'`,
        `file '${source2}'`,
        `file '${source3}'`
      ].join('\n'), 'utf8')
    ])
    await combineRawAudio(manifest, output)
    const contents = await fs.readFile(output, 'utf8')
    expect(contents).toBe('foobarbaz')
  })
})
