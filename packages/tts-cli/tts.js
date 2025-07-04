#!/usr/bin/env node
/**
 * Takes a text file and calls the appropriate TTS API
 *   to convert it to an audio file.
 */
const debug = require('debug')('tts-cli')
const { createProvider } = require('../tts-lib')

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

// Define the tasks and event listeners.
const doneSplitting = new Promise((resolve) => {
  debug('Listening for "split" event')
  provider.events.on('split', (info) => resolve(info.count))
})
const doneConverting = new Promise((resolve) => {
  debug('Listening for "manifest" event')
  provider.events.on('manifest', resolve)
})
const doneCombining = new Promise((resolve) => {
  debug('Listening for "save" event')
  provider.events.on('save', (info) => resolve(info.filename))
})
const doneCleaning = new Promise((resolve) => {
  debug('Listening for "clean" event')
  provider.events.on('clean', resolve)
})
const tasks = [{
  title: 'Reading text',
  task: async () => {
    const text = await readText(input, process)
    provider.convert(text) // kick off the conversion process
  }
}, {
  title: 'Splitting text',
  task: (ctx) => doneSplitting.then((count) => {
    ctx.count = count
  })
}, {
  title: 'Convert to audio',
  task: (ctx, task) => {
    task.title = `Convert to audio (0/${ctx.count})`
    debug('Listening for "generate" event')
    provider.events.on('generate', (info) => {
      task.title = `Convert to audio (${info.complete}/${info.count})`
    })
    return doneConverting
  }
}, {
  title: 'Combine audio',
  task: (ctx) => doneCombining.then((tempFile) => {
    ctx.tempFile = tempFile
  })
}, {
  title: 'Clean up',
  task: () => doneCleaning
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
