const async = require('async')
const debug = require('debug')

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
  let opts = ctx.args

  // Add in the default options.
  /* istanbul ignore next */
  opts = Object.assign({}, {
    'access-key': opts.accessKey,
    ffmpeg: opts.ffmpeg || 'ffmpeg',
    format: opts.format || 'mp3',
    lexicon: opts.lexicon,
    limit: Number(opts.throttle) || 5, // eslint-disable-line no-magic-numbers
    region: opts.region || 'us-east-1',
    'sample-rate': opts.sampleRate,
    'secret-key': opts.secretKey,
    type: opts.type || 'text',
    voice: opts.voice || 'Joanna'
  }, opts)
  /* istanbul ignore next */
  if (typeof opts.lexicon !== 'undefined' && !Array.isArray(opts.lexicon)) {
    opts.lexicon = [opts.lexicon]
  }
  /* istanbul ignore next */
  debug('generateSpeech')(`Options: ${JSON.stringify(this.sanitizeOpts(opts))}`) // eslint-disable-line no-invalid-this

  /* istanbul ignore next */
  let polly = createPolly(opts)

  // Compile the text parts and options together in a packet.
  /* istanbul ignore next */
  let parts = strParts.map(part => buildInfo(part, polly.getSynthesizeSpeechUrl.bind(polly), opts))

  /* istanbul ignore next */
  return generateAll(parts, opts, callAws, task)
    .then(createManifest)
    .then(manifest => {
      /* istanbul ignore next */
      return combine(manifest, opts)
    })
}
