#!/usr/bin/env node
/**
 * Takes a text file and calls the appropriate TTS API
 *   to convert it to an audio file.
 */
const debug = require('debug')('tts-cli')
const fs = require('fs-extra')
const { createProvider } = require('../tts-lib/lib/provider')
const { cleanup } = require('../tts-lib/lib/cleanup')

const { checkUsage } = require('./lib/check-usage')
const { moveTempFile } = require('./lib/move-temp-file')
const { readText } = require('./lib/read-text')
const { sanitizeOpts } = require('./lib/sanitize-opts')

const args = require('minimist')(process.argv.slice(2))
debug('called with arguments', JSON.stringify(sanitizeOpts(args)))

let [input, outputFilename] = args._

// If only 1 argument was given, use that for the output filename.
if (!outputFilename) {
  outputFilename = input
  input = null
}
debug('input:', input)
debug('output:', outputFilename)

// Check the usage.
checkUsage(args, process)

// Set the options.
const opts = Object.assign({}, {
  accessKey: args['access-key'],
  effect: args.effect,
  email: args.email,
  engine: args.engine,
  ffmpeg: args.ffmpeg || 'ffmpeg',
  format: args.format || 'mp3',
  gain: args.gain ? parseFloat(args.gain) : undefined,
  gender: args.gender,
  language: args.language,
  lexicon: args.lexicon,
  limit: Number(args.throttle) || 5, // eslint-disable-line no-magic-numbers
  pitch: args.pitch ? parseFloat(args.pitch) : undefined,
  privateKey: args['private-key'],
  projectFile: args['project-file'],
  projectId: args['project-id'],
  region: args.region || 'us-east-1',
  sampleRate: args['sample-rate'] ? Number(args['sample-rate']) : undefined,
  secretKey: args['secret-key'],
  speed: args.speed ? parseFloat(args.speed) : undefined,
  type: args.type || 'text',
  voice: args.voice
})
if (typeof opts.effect !== 'undefined' && !Array.isArray(opts.effect)) {
  opts.effect = [opts.effect]
}
if (typeof opts.lexicon !== 'undefined' && !Array.isArray(opts.lexicon)) {
  opts.lexicon = [opts.lexicon]
}
if (args['private-key-file']) {
  debug(`Reading private key from ${args['private-key-file']}`)
  opts.privateKey = fs.readFileSync(args['private-key-file'], 'utf8')
}
debug(`Options: ${JSON.stringify(sanitizeOpts(opts))}`)

// Create the service provider.
const service = args.service || 'aws'
const provider = createProvider(service, opts)

// Define the tasks and options.
const tasks = [{
  title: 'Reading text',
  task: async (ctx) => {
    ctx.text = await readText(input, process)
  }
}, {
  title: 'Splitting text',
  task: async (ctx) => {
    ctx.parts = await provider.splitText(ctx.text)
  }
}, {
  title: 'Convert to audio',
  task: async (ctx, task) => {
    ctx.manifestFile = await provider.generateSpeech(ctx.parts, task)
  }
}, {
  title: 'Combine audio',
  task: async (ctx) => {
    ctx.tempFile = await provider.combineAudio(ctx.manifestFile)
  }
}, {
  title: 'Clean up',
  task: async (ctx) => {
    await cleanup(ctx.manifestFile)
  }
}, {
  title: 'Saving file',
  task: moveTempFile
}]
const context = {
  args,
  input, // only used for testing
  outputFilename,
  service
}

// Run the tasks.
/* istanbul ignore next */
if (require.main === module) {
  const { Listr } = require('listr2')
  const list = new Listr(tasks, {
    renderer: debug.enabled ? 'silent' : 'default'
  })
  list.run(context).catch(err => {
    if (debug.enabled) {
      console.error(err.stack)
    }
  })
}

module.exports = { // for testing
  context,
  tasks
}
