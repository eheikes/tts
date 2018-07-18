#!/usr/bin/env node
/**
 * Takes a text file and calls the AWS Polly API
 *   to convert it to an audio file.
 */
const debug = require('debug')('tts-cli')
const { checkUsage } = require('./lib/check-usage')
const { cleanup } = require('./lib/cleanup')
const { combine } = require('./lib/combine-parts')
const { generateSpeech } = require('./lib/generate-speech')
const { moveTempFile } = require('./lib/move-temp-file')
const { readText } = require('./lib/read-text')
const { sanitizeOpts } = require('./lib/sanitize-opts')
const { splitText } = require('./lib/split-text')

const args = require('minimist')(process.argv.slice(2))
const maxCharacterCount = 1500
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

// Define the tasks and options.
const tasks = [{
  title: 'Reading text',
  task: readText
}, {
  title: 'Splitting text',
  task: splitText
}, {
  title: 'Convert to audio',
  task: generateSpeech
}, {
  title: 'Combine audio',
  task: combine
}, {
  title: 'Clean up',
  task: cleanup
}, {
  title: 'Saving file',
  task: moveTempFile
}]
const context = {
  args,
  input,
  maxCharacterCount,
  outputFilename,
  process
}

// Run the tasks.
if (require.main === module) /* istanbul ignore next */{
  const Listr = require('listr')
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
