/* istanbul ignore file */
import * as d from 'debug'

export const debug = (name: string) => d(`tts-lib:${name}`)
