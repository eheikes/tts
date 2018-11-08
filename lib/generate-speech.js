const async = require('async')
const debug = require('debug')
const fs = require('fs-extra')
const tempfile = require('tempfile')
const { extensionFor } = require('./file-extensions')
const { sanitizeOpts } = require('./sanitize-opts')

/**
 * Creates an object containing all the data.
 */
exports.buildInfo = (text, instance, task, ctx) => {
  return Object.assign({
    opts: ctx.opts,
    task: task,
    tempfile: tempfile(`.${extensionFor(ctx.opts.format, ctx.service)}`),
    text: text
  }, instance.buildPart(text, task, ctx.opts))
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
    accessKey: ctx.args['access-key'],
    email: ctx.args.email,
    ffmpeg: ctx.args.ffmpeg || 'ffmpeg',
    format: ctx.args.format || 'mp3',
    gender: ctx.args.gender,
    language: ctx.args.language || (ctx.service === 'gcp' ? 'en-US' : undefined),
    lexicon: ctx.args.lexicon,
    limit: Number(ctx.args.throttle) || 5, // eslint-disable-line no-magic-numbers
    pitch: ctx.args.pitch ? parseFloat(ctx.args.pitch) : undefined,
    privateKey: ctx.args['private-key'],
    projectFile: ctx.args['project-file'],
    projectId: ctx.args['project-id'],
    region: ctx.args.region || 'us-east-1',
    sampleRate: ctx.args['sample-rate'],
    secretKey: ctx.args['secret-key'],
    speed: ctx.args.speed ? parseFloat(ctx.args.speed) : undefined,
    type: ctx.args.type || 'text',
    voice: ctx.args.voice || (ctx.service === 'gcp' ? undefined : 'Joanna')
  })
  if (typeof ctx.opts.lexicon !== 'undefined' && !Array.isArray(ctx.opts.lexicon)) {
    ctx.opts.lexicon = [ctx.opts.lexicon]
  }
  if (ctx.service === 'aws' && ctx.opts.format === 'ogg_vorbis') {
    debug('generateSpeech')('Warning: Format "ogg_vorbis" is deprecated; use "ogg" instead')
    ctx.opts.format = 'ogg'
  }
  if (ctx.args['private-key-file']) {
    debug('generateSpeech')(`Reading private key from ${ctx.args['private-key-file']}`)
    ctx.opts.privateKey = fs.readFileSync(ctx.args['private-key-file'], 'utf8')
  }
  debug('generateSpeech')(`Options: ${JSON.stringify(sanitizeOpts(ctx.opts))}`)

  const provider = require(`./providers/${ctx.service}`)
  const instance = provider.create(ctx.opts)

  // Compile the text parts and options together in a packet.
  let parts = strParts.map(part => exports.buildInfo(part, instance, task, ctx))

  return exports.generateAll(parts, ctx.opts, instance.generate.bind(instance), task)
    .then(exports.createManifest)
    .then(manifest => {
      ctx.manifestFile = manifest
    })
}
