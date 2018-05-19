const async = require('async')
const Polly = require('aws-sdk/clients/polly').Presigner
const debug = require('debug')
const fs = require('fs-extra')
const got = require('got')
const tempfile = require('tempfile')
const fileExtensions = require('./file-extensions')
const { sanitizeOpts } = require('./sanitize-opts')

/**
 * Creates an object containing all the data.
 */
exports.buildInfo = (text, urlCreator, task, opts) => {
  return {
    opts: opts,
    task: task,
    tempfile: tempfile(`.${fileExtensions[opts.format]}`),
    text: text,
    urlcreator: urlCreator
  }
}

/**
 * Calls AWS Polly with the given info.
 */
exports.callAws = (info, i, callback) => {
  const secsPerMin = 60
  const minsInHalfHour = 30
  const halfHour = secsPerMin * minsInHalfHour

  info.task.title = info.task.title.replace(/\d+\//, `${i}/`)

  let url = info.urlcreator({
    LexiconNames: info.opts.lexicon,
    OutputFormat: info.opts.format,
    SampleRate: info.opts['sample-rate'] ? String(info.opts['sample-rate']) : undefined,
    Text: info.text,
    TextType: info.opts.type,
    VoiceId: info.opts.voice
  }, halfHour)

  let error
  debug('callAws')(`Opening output stream to ${info.tempfile}`)
  let outputStream = fs.createWriteStream(info.tempfile)
  outputStream.on('close', () => {
    debug('callAws')('Closing output stream')
    callback(error)
    /* istanbul ignore if */
    if (error) {
      debug('callAws')(`Error during request: ${error.message}`)
      // Get the error message from Amazon.
      try {
        let response = fs.readFileSync(info.tempfile, 'utf8')
        debug('callAws')(`Amazon responded with ${response}`)
        let parsedResponse = JSON.parse(response)
        error.message += `: ${parsedResponse.message}`
      } catch (err) { }
    }
  })
  let sanitizedUrl = url
    .replace(/(Text=.{1,10})([^&]*)/, '$1...')
    .replace(/(X-Amz-Credential=)([^&]*)/, '$1...')
    .replace(/(X-Amz-Signature=.)([^&]*)/, '$1...')
  debug('callAws')(`Making request to ${sanitizedUrl}`)
  got.stream(url).on('error', /* istanbul ignore next */ err => { error = err }).pipe(outputStream)
}

/**
 * Writes down all the temp files for ffmpeg to read in.
 * Returns the text filename.
 */
exports.createManifest = parts => {
  let txtFile = tempfile('.txt')
  debug('createManifest')(`Creating ${txtFile} for manifest`)
  let contents = parts.map(info => {
    return `file '${info.tempfile}'`
  }).join('\n')
  debug('createManifest')(`Writing manifest contents:\n${contents}`)
  fs.writeFileSync(txtFile, contents, 'utf8')
  return txtFile
}

/**
 * Create an AWS Polly instance.
 */
exports.createPolly = opts => {
  debug('createPolly')(`Creating Polly instance in ${opts.region}`)
  return new Polly({
    apiVersion: '2016-06-10',
    region: opts.region,
    accessKeyId: opts['access-key'],
    secretAccessKey: opts['secret-key']
  })
}

/**
 * Calls the API for each text part (throttled). Returns a Promise.
 */
exports.generateAll = (parts, opts, func, task) => {
  let count = parts.length
  task.title = `Convert to audio (0/${count})`
  return (new Promise((resolve, reject) => {
    debug('generateAll')(`Requesting ${count} audio segments, ${opts.limit} at a time`)
    async.eachOfLimit(
      parts,
      opts.limit,
      func,
      err => {
        debug('generateAll')(`Requested all parts, with error ${err}`)
        if (err) {
          return reject(err)
        }
        task.title = task.title.replace(/\d+\//, `${count}/`)
        resolve(parts)
      }
    )
  }))
}

/**
 * Returns a Promise with the temporary audio file.
 */
exports.generateSpeech = (ctx, task) => {
  const strParts = ctx.parts

  // Add in the default options.
  ctx.opts = Object.assign({}, {
    'access-key': ctx.args.accessKey,
    ffmpeg: ctx.args.ffmpeg || 'ffmpeg',
    format: ctx.args.format || 'mp3',
    lexicon: ctx.args.lexicon,
    limit: Number(ctx.args.throttle) || 5, // eslint-disable-line no-magic-numbers
    region: ctx.args.region || 'us-east-1',
    'sample-rate': ctx.args.sampleRate,
    'secret-key': ctx.args.secretKey,
    type: ctx.args.type || 'text',
    voice: ctx.args.voice || 'Joanna'
  }, ctx.args)
  if (typeof ctx.opts.lexicon !== 'undefined' && !Array.isArray(ctx.opts.lexicon)) {
    ctx.opts.lexicon = [ctx.opts.lexicon]
  }
  debug('generateSpeech')(`Options: ${JSON.stringify(sanitizeOpts(ctx.opts))}`)

  let polly = exports.createPolly(ctx.opts)

  // Compile the text parts and options together in a packet.
  let parts = strParts.map(part => exports.buildInfo(part, polly.getSynthesizeSpeechUrl.bind(polly), task, ctx.opts))

  return exports.generateAll(parts, ctx.opts, exports.callAws, task)
    .then(exports.createManifest)
    .then(manifest => {
      ctx.manifestFile = manifest
    })
}
