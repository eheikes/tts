import { SupportedProvider } from './providers/supported'

export interface SpeechOptions {
  accessKey?: string
  effect?: string[]
  email?: string
  ffmpeg?: string
  format?: string
  gain?: number // float
  gender?: string
  language?: string
  lexicon?: string[]
  limit?: number
  pitch?: number // float
  privateKey?: string
  privateKeyFile?: string
  projectFile?: string
  projectId?: string
  region?: string
  sampleRate?: number
  secretKey?: string
  service?: SupportedProvider
  speed?: number // float
  type?: string
  voice?: string
}

// Important: This should not have a defined type; it should be literal for type checking reasons.
export const defaultOptions = {
  ffmpeg: 'ffmpeg',
  format: 'mp3',
  language: 'en-US',
  limit: 5,
  region: 'us-east-1',
  service: SupportedProvider.AWS,
  type: 'text',
  voice: 'Joanna'
}

export type SpeechOptionsWithDefaults = Required<Pick<SpeechOptions, keyof typeof defaultOptions>> & Partial<SpeechOptions>

export const sanitizeOptions = (opts: SpeechOptions): SpeechOptions => {
  const sanitizedOpts = { ...opts }
  sanitizedOpts.accessKey = sanitizedOpts.accessKey ? 'XXXXXXXX' : undefined
  sanitizedOpts.secretKey = sanitizedOpts.secretKey ? 'XXXXXXXX' : undefined
  sanitizedOpts.privateKey = sanitizedOpts.privateKey ? 'XXXXXXXX' : undefined
  return sanitizedOpts
}
