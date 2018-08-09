const async = require('async')
const debug = require('debug')
const fs = require('fs-extra')
const tempfile = require('tempfile')
const fileExtensions = require('./file-extensions')
const { sanitizeOpts } = require('./sanitize-opts')

/**
 * Creates an object containing all the data.
 */
exports.buildInfo = (text, instance, task, opts) => {
  return Object.assign({
    opts: opts,
    task: task,
    tempfile: tempfile(`.${fileExtensions[opts.format]}`),
    text: text
  }, instance.buildPart(text, task, opts))
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
    provider: 'aws',
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

  const provider = require(`./providers/${ctx.opts.provider}`)
  const instance = provider.create(ctx.opts)

  // Compile the text parts and options together in a packet.
  let parts = strParts.map(part => exports.buildInfo(part, instance, task, ctx.opts))

  return exports.generateAll(parts, ctx.opts, instance.generate.bind(instance), task)
    .then(exports.createManifest)
    .then(manifest => {
      ctx.manifestFile = manifest
    })
}
