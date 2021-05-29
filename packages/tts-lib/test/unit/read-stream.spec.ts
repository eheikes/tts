import { Readable } from 'stream'
import { readStream } from '../../src/read-stream'

describe('readStream()', () => {
  it('should return the contents of the stream', async () => {
    const stream = new Readable({
      read() {}
    })
    const promise = readStream(stream)
    stream.push('test1')
    stream.push('test2')
    stream.push('test3')
    stream.push(null)
    const text = await promise
    expect(text).toBe('test1test2test3')
  })
})
