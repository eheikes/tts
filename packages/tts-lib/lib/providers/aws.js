const { Polly, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly')
const debug = require('debug')
const fs = require('fs-extra')
const tempfile = require('tempfile')
const { combine } = require('../combine-parts')
const { createManifest, generateAll } = require('../generate-speech')
const { splitText } = require('../split-text')

const AwsProvider = function (opts = {}) {
  this.name = 'AWS'
  this.maxCharacterCount = 1500

  this.opts = opts
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

AwsProvider.prototype.extensionFor = (format) => {
  if (format === 'mp3') {
    return 'mp3'
  } else if (format === 'ogg' || format === 'ogg_vorbis') {
    return 'ogg'
  } else if (format === 'pcm') {
    return 'pcm'
  }
  throw new Error(`No known file extension for "${format}" format`)
}

AwsProvider.prototype.splitText = function (text) { // TODO put on parent
  return splitText(text, this.maxCharacterCount, this.opts.type)
}

AwsProvider.prototype.combineAudio = function (manifestFile) { // TODO put on parent
  const newFile = tempfile(`.${this.extensionFor(this.opts.format)}`)
  return combine(manifestFile, newFile, this.opts.format === 'pcm' ? 'raw' : 'encoded', this.opts.ffmpeg)
}

/**
 * Creates an object containing all the data.
 */
AwsProvider.prototype.buildInfo = function (text, task) {
  return {
    task,
    tempfile: tempfile(`.${this.extensionFor(this.opts.format)}`),
    text,
    send: this.instance.send.bind(this.instance)
  }
}

/**
 * Calls the Polly API with the given info.
 */
AwsProvider.prototype.generate = function (info, i, callback) {
  info.task.title = info.task.title.replace(/\d+\//, `${i}/`)

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
  info.send(command).then(response => {
    debug('generate')(`Writing audio content to ${info.tempfile}`)
    const fileStream = fs.createWriteStream(info.tempfile)
    response.AudioStream.pipe(fileStream)
    fileStream.on('finish', () => {
      fileStream.close()
      callback()
    })
    fileStream.on('error', err => {
      debug('generate')(`Error writing: ${err.message}`)
      return callback(err)
    })
  }, err => {
    debug('generate')(`Error during request: ${err.message}`)
    return callback(err)
  })
}

/**
 * Returns a Promise with the temporary audio file.
 */
AwsProvider.prototype.generateSpeech = async function (strParts, task) { // TODO put on parent
  // Compile the text parts and options together in a packet.
  const parts = strParts.map(part => this.buildInfo(part, task))
  const updatedParts = await generateAll(parts, this.opts.limit, this.generate.bind(this), task)
  return createManifest(updatedParts)
}

exports.AwsProvider = AwsProvider
