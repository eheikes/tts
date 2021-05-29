import { combineEncodedAudio } from '../../src/combine'
import { Provider } from '../../src/provider'
import { StreamEvent } from '../../src/stream-event'

jest.mock('../../src/combine')

const testTempFilename = 'test-file.foo'
const testFinalFilename = 'test-file.mp3'

class TestProvider extends Provider {
  async generatePart (_text: string) {
    return {
      filename: testTempFilename
    }
  }
}

describe('Provider', () => {
  const mockCombineEncodedAudio = combineEncodedAudio as jest.MockedFunction<typeof combineEncodedAudio>
  let p: TestProvider

  beforeEach(() => {
    mockCombineEncodedAudio.mockResolvedValue()
    p = new TestProvider()
  })

  it('should should expose maxCharacterCount', () => {
    expect(p.maxCharacterCount).toBe(Infinity)
  })

  describe('generate()', () => {
    it('should return a stream', () => {
      const stream = p.generate('testing')
      expect(stream.on).toEqual(expect.any(Function))
      expect(stream.pipe).toEqual(expect.any(Function))
    })

    it('should emit a "split" event with the text chunks', done => {
      p.on(StreamEvent.Split, chunks => {
        expect(chunks).toEqual(['testing'])
        done()
      })
      p.generate('testing')
    })

    it('should emit an "end" event with the generated parts', done => {
      p.on(StreamEvent.End, parts => {
        expect(parts).toEqual([{
          filename: testTempFilename
        }])
        done()
      })
      p.generate('testing')
    })

    it('should emit a "save" event with the filename', done => {
      p.on(StreamEvent.Save, filename => {
        expect(filename).toMatch(/\.mp3$/)
        done()
      })
      p.generate('testing')
    })

    it('should emit a "close" event with the result', done => {
      p.on(StreamEvent.Finish, filename => {
        expect(filename).toEqual({
          filename: expect.any(String)
        })
        done()
      })
      p.generate('testing')
    })

    it('should emit an "error" event if an error occurs', done => {
      mockCombineEncodedAudio.mockImplementation(() => {
        throw new Error('testing error')
      })
      p.on(StreamEvent.Error, err => {
        expect(err.message).toBe('testing error')
        done()
      })
      p.generate('testing')
    })
  })
})
