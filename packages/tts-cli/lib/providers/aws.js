const { Polly, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly')
const debug = require('debug')
const fs = require('fs-extra')

const PollyProvider = function (opts) {
  this.instance = new Polly({
    credentials: {
      accessKeyId: opts.accessKey,
      secretAccessKey: opts.secretKey
    },
    region: opts.region
  })
}

exports.PollyProvider = PollyProvider

PollyProvider.prototype.buildPart = function () {
  return {
    send: this.instance.send.bind(this.instance)
  }
}

/**
 * Calls the Polly API with the given info.
 */
PollyProvider.prototype.generate = (info, i, callback) => {
  info.task.title = info.task.title.replace(/\d+\//, `${i}/`)

  let command = new SynthesizeSpeechCommand({
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
 * Create an AWS Polly instance.
 */
exports.create = opts => {
  debug('create')(`Creating AWS Polly instance in ${opts.region}`)
  return new PollyProvider(opts)
}
