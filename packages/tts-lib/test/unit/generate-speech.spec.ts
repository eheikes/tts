import { Readable } from 'stream'
import { generateSpeech } from '../../src/generate-speech'
import { SpeechResult } from '../../src/speech-result'
import { createSpeechStream } from '../../src/speech-stream'

let stream: Readable
jest.mock('../../src/speech-stream', () => {
  return {
    createSpeechStream: () => stream
  }
})

describe('generateSpeech()', () => {
  beforeEach(() => {
    stream = new Readable()
  })

  it('should resolve with the object containing the audio filename', async () => {
    const promise = generateSpeech('test')
    const expectedResult: SpeechResult = {
      filename: 'foobar'
    }
    stream.emit('save', expectedResult)
    const actualResult = await promise
    expect(actualResult.filename).toBe('foobar')
  })

  it('should throw an error if an error occurs', async () => {
    const promise = generateSpeech('test')
    try {
      stream.emit('error', new Error('test error'))
      await promise
      throw new Error('should have thrown an error')
    } catch (err) {
      expect(err.message).toBe('test error')
    }
  })
})
