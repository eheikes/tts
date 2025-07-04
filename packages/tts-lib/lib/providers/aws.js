const { Polly, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly')
const debug = require('debug')
const { createWriteStream } = require('fs')
const { pipeline } = require('stream/promises')
const tempfile = require('tempfile')
const { combine } = require('../combine')
const { Provider } = require('../provider')

class AwsProvider extends Provider {
  constructor (opts = {}) {
    super(opts)
    this.name = 'AWS'
    this.maxCharacterCount = 1500

    if (this.opts.format === 'ogg_vorbis') {
      debug('aws')('Warning: Format "ogg_vorbis" is deprecated; use "ogg" instead')
      this.opts.format = 'ogg'
    }
    if (typeof this.opts.voice === 'undefined') {
      debug('aws')('Setting default voice to "Joanna"')
      this.opts.voice = 'Joanna'
    }

    debug('create')(`Creating AWS Polly instance in ${this.opts.region}`)
    this.instance = new Polly({
      credentials: {
        accessKeyId: this.opts.accessKey,
        secretAccessKey: this.opts.secretKey
      },
      region: this.opts.region
    })
  }

  async combine (manifestFile, newFile) {
    return combine(manifestFile, newFile, this.opts.format === 'pcm' ? 'raw' : 'encoded', this.opts.ffmpeg)
  }

  extensionFor (format) {
    if (format === 'mp3') {
      return 'mp3'
    } else if (format === 'ogg' || format === 'ogg_vorbis') {
      return 'ogg'
    } else if (format === 'pcm') {
      return 'pcm'
    }
    throw new Error(`No known file extension for "${format}" format`)
  }

  /**
   * Calls the Polly API with the given text.
   */
  async generate (str) {
    const filename = tempfile(`.${this.extensionFor(this.opts.format)}`)
    const command = new SynthesizeSpeechCommand({
      Engine: this.opts.engine,
      LanguageCode: this.opts.language,
      LexiconNames: this.opts.lexicon,
      OutputFormat: this.opts.format === 'ogg' ? 'ogg_vorbis' : this.opts.format,
      SampleRate: this.opts.sampleRate ? String(this.opts.sampleRate) : undefined,
      Text: str,
      TextType: this.opts.type,
      VoiceId: this.opts.voice
    })

    debug('generate')('Making request to Amazon Web Services')
    let response
    try {
      response = await this.instance.send(command)
    } catch (err) {
      debug('generate')(`Error during request: ${err.message}`)
      throw err
    }

    debug('generate')(`Writing audio content to ${filename}`)
    try {
      const fileStream = createWriteStream(filename)
      await pipeline(response.AudioStream, fileStream)
      fileStream.close()
    } catch (err) {
      debug('generate')(`Error writing: ${err.message}`)
      throw err
    }
    return { tempfile: filename }
  }
}

exports.AwsProvider = AwsProvider
