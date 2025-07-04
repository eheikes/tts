const debug = require('debug')
const { writeFile } = require('fs/promises')
const { promisify } = require('util')
const path = require('path')
const tempfile = require('tempfile')
const GoogleClient = require('@google-cloud/text-to-speech').TextToSpeechClient
const { Provider } = require('../provider')

class GcpProvider extends Provider {
  constructor (opts = {}) {
    super(opts)
    this.name = 'GCP'
    this.maxCharacterCount = 5000

    if (typeof this.opts.language === 'undefined') {
      debug('gcp')('Setting default language to "en-US"')
      this.opts.language = 'en-US'
    }

    debug('create')('Creating Google Cloud TTS instance')
    try {
      this.instance = new GoogleClient({
        credentials: this.opts.email || this.opts.privateKey
          ? {
              client_email: this.opts.email,
              private_key: this.opts.privateKey
            }
          : undefined,
        keyFilename: this.opts.projectFile ? path.resolve(this.opts.projectFile) : undefined,
        projectId: this.opts.projectId
      })
    } catch (err) {
      /* istanbul ignore next */
      this.instance = null
    }
  }

  extensionFor (format) {
    if (format === 'mp3') {
      return 'mp3'
    } else if (format === 'ogg' || format === 'ogg_vorbis') {
      return 'ogg'
    } else if (format === 'pcm') {
      return 'wav'
    }
    throw new Error(`No known file extension for "${format}" format`)
  }

  /**
   * Calls the Google Cloud API with the given text.
   */
  async generate (str) {
    const filename = tempfile(`.${this.extensionFor(this.opts.format)}`)
    const request = {
      input: this.opts.type === 'ssml'
        ? { ssml: str }
        : { text: str },
      voice: {
        ssmlGender: this.opts.gender ? String(this.opts.gender).toUpperCase() : undefined,
        languageCode: this.opts.language,
        name: this.opts.voice
      },
      audioConfig: {
        audioEncoding: this.opts.format === 'pcm'
          ? 'LINEAR16'
          : this.opts.format === 'ogg' ? 'OGG_OPUS' : 'MP3',
        effectsProfileId: this.opts.effect,
        pitch: this.opts.pitch,
        sampleRateHertz: this.opts.sampleRate,
        speakingRate: this.opts.speed,
        volumeGainDb: this.opts.gain
      }
    }
    const opts = {
      retry: null
    }

    let response
    debug('generate')('Making request to Google Cloud Platform')
    try {
      response = await promisify(this.instance.synthesizeSpeech.bind(this.instance))(request, opts)
    } catch (err) {
      debug('generate')(`Error during request: ${err.message}`)
      throw err
    }

    debug('generate')(`Writing audio content to ${filename}`)
    try {
      await writeFile(filename, response.audioContent, 'binary')
    } catch (err) {
      debug('generate')(`Error writing: ${err.message}`)
      throw err
    }

    return { tempfile: filename }
  }
}

exports.GcpProvider = GcpProvider
