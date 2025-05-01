const debug = require('debug')
const fs = require('fs-extra')
const path = require('path')
const tempfile = require('tempfile')
const GoogleClient = require('@google-cloud/text-to-speech').TextToSpeechClient
const { combine } = require('../combine-parts')
const { createManifest, generateAll } = require('../generate-speech')
const { splitText } = require('../split-text')

const GcpProvider = function (opts = {}) {
  this.name = 'GCP'
  this.maxCharacterCount = 5000

  this.opts = opts
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

GcpProvider.prototype.extensionFor = (format) => {
  if (format === 'mp3') {
    return 'mp3'
  } else if (format === 'ogg' || format === 'ogg_vorbis') {
    return 'ogg'
  } else if (format === 'pcm') {
    return 'wav'
  }
  throw new Error(`No known file extension for "${format}" format`)
}

GcpProvider.prototype.splitText = function (text) { // TODO put on parent
  return splitText(text, this.maxCharacterCount, this.opts.type)
}

GcpProvider.prototype.combineAudio = function (manifestFile) { // TODO put on parent
  const newFile = tempfile(`.${this.extensionFor(this.opts.format)}`)
  return combine(manifestFile, newFile, 'encoded', this.opts.ffmpeg)
}

/**
 * Creates an object containing all the data.
 */
GcpProvider.prototype.buildInfo = function (text, task) {
  return {
    task,
    tempfile: tempfile(`.${this.extensionFor(this.opts.format)}`),
    text,
    synthesizer: this.instance.synthesizeSpeech.bind(this.instance)
  }
}

/**
 * Calls the Google Cloud API with the given info.
 */
GcpProvider.prototype.generate = function (info, i, callback) {
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
      audioEncoding: info.opts.format === 'pcm'
        ? 'LINEAR16'
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
 * Returns a Promise with the temporary audio file.
 */
GcpProvider.prototype.generateSpeech = async function (strParts, task) {
  // Compile the text parts and options together in a packet.
  const parts = strParts.map(part => this.buildInfo(part, task))
  const updatedParts = await generateAll(parts, this.opts.limit, this.generate.bind(this), task)
  return createManifest(updatedParts)
}

exports.GcpProvider = GcpProvider
