#!/usr/bin/env node
/**
 * Takes a text file and calls the appropriate TTS API
 *   to convert it to an audio file.
 */
const debug = require('debug')('tts-cli')
const { cleanup, createProvider } = require('../tts-lib')

const { program } = require('./lib/program')
const { moveTempFile } = require('./lib/move-temp-file')
const { readText } = require('./lib/read-text')
const { sanitizeOpts } = require('./lib/sanitize-opts')

program.parse()
let [input, outputFilename] = program.args

// If only 1 argument was given, use that for the output filename.
if (!outputFilename) {
  outputFilename = input
  input = null
}
debug('input:', input)
debug('output:', outputFilename)

// Set the options.
const opts = program.opts()
debug(`Options: ${JSON.stringify(sanitizeOpts(opts))}`)

// Create the service provider.
const provider = createProvider(opts.service, opts)

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
  input, // only used for testing
  outputFilename,
  service: opts.service // only used for testing
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
