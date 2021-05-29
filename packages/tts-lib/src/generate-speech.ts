import { Readable } from 'stream'
import { SpeechOptions } from './options'
import { createSpeechStream } from './speech-stream'
import { SpeechResult } from './speech-result'

/**
 * Generates speech from the given text or input stream.
 */
export const generateSpeech = async (
  text: string | Readable,
  opts: SpeechOptions = {}
): Promise<SpeechResult> => {
  const stream = createSpeechStream(text, opts)
  return new Promise((resolve, reject) => {
    stream.on('save', (result: SpeechResult) => {
      resolve(result)
    })
    stream.on('error', (err: Error) => {
      reject(err)
    })
  })
}
