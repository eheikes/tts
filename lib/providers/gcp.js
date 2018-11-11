const debug = require('debug')
const fs = require('fs-extra')
const path = require('path')
const GoogleClient = require('@google-cloud/text-to-speech').TextToSpeechClient

const GoogleProvider = function (opts) {
  try {
    this.instance = new GoogleClient({
      credentials: opts.email || opts.privateKey ? {
        client_email: opts.email,
        private_key: opts.privateKey
      } : undefined,
      keyFilename: opts.projectFile ? path.resolve(opts.projectFile) : undefined,
      projectId: opts.projectId
    })
  } catch (err) {
    /* istanbul ignore next */
    this.instance = null
  }
}

exports.GoogleProvider = GoogleProvider

GoogleProvider.prototype.buildPart = function () {
  return {
    synthesizer: this.instance.synthesizeSpeech.bind(this.instance)
  }
}

/**
 * Calls the Google Cloud API with the given info.
 */
GoogleProvider.prototype.generate = (info, i, callback) => {
  info.task.title = info.task.title.replace(/\d+\//, `${i}/`)

  const request = {
    input: info.opts.type === 'ssml'
      ? { ssml: info.text }
      : { text: info.text },
    voice: {
      ssmlGender: info.opts.gender ? String(info.opts.gender).toUpperCase() : undefined,
      languageCode: info.opts.language,
      name: info.opts.voice
    },
    audioConfig: {
      audioEncoding: info.opts.format === 'pcm' ? 'LINEAR16'
        : info.opts.format === 'ogg' ? 'OGG_OPUS' : 'MP3',
      effectsProfileId: info.opts.effect,
      pitch: info.opts.pitch,
      sampleRateHertz: info.opts.sampleRate,
      speakingRate: info.opts.speed,
      volumeGainDb: info.opts.gain
    }
  }
  const opts = {
    retry: null
  }

  debug('generate')('Making request to Google Cloud Platform')
  info.synthesizer(request, opts, (err, response) => {
    if (err) {
      debug('generate')(`Error during request: ${err.message}`)
      return callback(err)
    }

    debug('generate')(`Writing audio content to ${info.tempfile}`)
    fs.writeFile(info.tempfile, response.audioContent, 'binary', err => {
      if (err) {
        debug('generate')(`Error writing: ${err.message}`)
        return callback(err)
      }
      callback()
    })
  })
}

/**
 * Create a Google Cloud TTS instance.
 */
exports.create = opts => {
  debug('create')(`Creating Google Cloud TTS instance`)
  return new GoogleProvider(opts)
}
