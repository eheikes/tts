const debug = require('debug')
const fs = require('fs-extra')
const GoogleClient = require('@google-cloud/text-to-speech').TextToSpeechClient

const GoogleProvider = function (opts) {
  try {
    this.instance = new GoogleClient({
      credentials: {
        // TODO
        client_email: 'foo@example.com',
        private_key: 'fake key'
      }
    })
  } catch (err) {
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
      name: String(info.opts.voice)
    },
    audio_config: {
      audio_encoding: info.opts.format === 'pcm' ? 'LINEAR16'
        : info.opts.format === 'ogg' ? 'OGG_OPUS' : 'MP3',
      sample_rate_hertz: info.opts['sample-rate']
        ? parseInt(info.opts['sample-rate'], 10)
        : undefined
    }
  }

  debug('generate')('Making request to Google Cloud Platform')
  info.synthesizer(request, (err, response) => {
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
