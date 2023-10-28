const debug = require('debug')
const fs = require('fs-extra')
const got = require('got')
const Polly = require('aws-sdk/clients/polly').Presigner

// Ignore v2 deprecation warnings for now.
require('aws-sdk/lib/maintenance_mode_message').suppress = true

const PollyProvider = function (opts) {
  this.instance = new Polly({
    apiVersion: '2016-06-10',
    region: opts.region,
    accessKeyId: opts.accessKey,
    secretAccessKey: opts.secretKey
  })
}

exports.PollyProvider = PollyProvider

PollyProvider.prototype.buildPart = function () {
  return {
    urlcreator: this.instance.getSynthesizeSpeechUrl.bind(this.instance)
  }
}

/**
 * Calls the Polly API with the given info.
 */
PollyProvider.prototype.generate = (info, i, callback) => {
  const secsPerMin = 60
  const minsInHalfHour = 30
  const halfHour = secsPerMin * minsInHalfHour

  info.task.title = info.task.title.replace(/\d+\//, `${i}/`)

  let url = info.urlcreator({
    Engine: info.opts.engine,
    LanguageCode: info.opts.language,
    LexiconNames: info.opts.lexicon,
    OutputFormat: info.opts.format === 'ogg' ? 'ogg_vorbis' : info.opts.format,
    SampleRate: info.opts.sampleRate ? String(info.opts.sampleRate) : undefined,
    Text: info.text,
    TextType: info.opts.type,
    VoiceId: info.opts.voice
  }, halfHour)

  let error
  debug('generate')(`Opening output stream to ${info.tempfile}`)
  let outputStream = fs.createWriteStream(info.tempfile)
  outputStream.on('close', () => {
    debug('generate')('Closing output stream')
    callback(error)
    /* istanbul ignore if */
    if (error) {
      debug('generate')(`Error during request: ${error.message}`)
      // Get the error message from Amazon.
      try {
        let response = fs.readFileSync(info.tempfile, 'utf8')
        debug('generate')(`Amazon responded with ${response}`)
        let parsedResponse = JSON.parse(response)
        error.message += `: ${parsedResponse.message}`
      } catch (err) { }
    }
  })
  let sanitizedUrl = url
    .replace(/(Text=.{1,10})([^&]*)/, '$1...')
    .replace(/(X-Amz-Credential=)([^&]*)/, '$1...')
    .replace(/(X-Amz-Signature=.)([^&]*)/, '$1...')
  debug('generate')(`Making request to ${sanitizedUrl}`)
  got.stream(url).on('error', /* istanbul ignore next */ err => { error = err }).pipe(outputStream)
}

/**
 * Create an AWS Polly instance.
 */
exports.create = opts => {
  debug('create')(`Creating AWS Polly instance in ${opts.region}`)
  return new PollyProvider(opts)
}
