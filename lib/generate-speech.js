const async = require('async')
const debug = require('debug')
const fs = require('fs-extra')
const tempfile = require('tempfile')

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
  /* istanbul ignore next */
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
  /* istanbul ignore next */
  if (typeof ctx.opts.lexicon !== 'undefined' && !Array.isArray(ctx.opts.lexicon)) {
    ctx.opts.lexicon = [ctx.opts.lexicon]
  }
  /* istanbul ignore next */
  debug('generateSpeech')(`Options: ${JSON.stringify(this.sanitizeOpts(ctx.opts))}`) // eslint-disable-line no-invalid-this

  /* istanbul ignore next */
  let polly = createPolly(ctx.opts)

  // Compile the text parts and options together in a packet.
  /* istanbul ignore next */
  let parts = strParts.map(part => buildInfo(part, polly.getSynthesizeSpeechUrl.bind(polly), ctx.opts))

  /* istanbul ignore next */
  return generateAll(parts, ctx.opts, callAws, task).then(createManifest).then(manifest => {
    ctx.manifestFile = manifest
  })
}
