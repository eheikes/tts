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

  /**
   * Creates an object containing all the data.
   */
  buildInfo (text, task) {
    return {
      opts: this.opts,
      task,
      tempfile: tempfile(`.${this.extensionFor(this.opts.format)}`),
      text,
      send: this.instance.send.bind(this.instance)
    }
  }

  combineAudio (manifestFile) {
    const newFile = tempfile(`.${this.extensionFor(this.opts.format)}`)
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
   * Calls the Polly API with the given info.
   */
  async generate (info, i, callback) {
    /* istanbul ignore else: not a real-life scenario */
    if (info.task.title.length < 1000) { // prevent regexp DoS
      info.task.title = info.task.title.replace(/\d+\//, `${i}/`)
    }

    const command = new SynthesizeSpeechCommand({
      Engine: info.opts.engine,
      LanguageCode: info.opts.language,
      LexiconNames: info.opts.lexicon,
      OutputFormat: info.opts.format === 'ogg' ? 'ogg_vorbis' : info.opts.format,
      SampleRate: info.opts.sampleRate ? String(info.opts.sampleRate) : undefined,
      Text: info.text,
      TextType: info.opts.type,
      VoiceId: info.opts.voice
    })

    debug('generate')('Making request to Amazon Web Services')
    let response
    try {
      response = await info.send(command)
    } catch (err) {
      debug('generate')(`Error during request: ${err.message}`)
      throw err
    }

    debug('generate')(`Writing audio content to ${info.tempfile}`)
    try {
      const fileStream = createWriteStream(info.tempfile)
      await pipeline(response.AudioStream, fileStream)
      fileStream.close()
    } catch (err) {
      debug('generate')(`Error writing: ${err.message}`)
      throw err
    }
  }
}

exports.AwsProvider = AwsProvider
