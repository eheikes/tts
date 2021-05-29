import { Readable } from 'stream'
import { debug } from './debug'
import { sanitizeOptions, SpeechOptions } from './options'
import { ProviderConstructor } from './provider'

/**
 * Lower-level function to generate speech.
 * Returns a stream that fires events as it progresses -- see StreamEvent for a list.
 */
export const createSpeechStream = (
  text: string | Readable,
  opts: SpeechOptions = {}
): Readable => {
  debug(`Options: ${JSON.stringify(sanitizeOptions(opts))}`)

  // Create a provider instance.
  const P: ProviderConstructor = require(`./providers/${opts.service}`).default
  const instance = new P(opts)

  // Begin generating speech and return the stream.
  return instance.generate(text)
}
