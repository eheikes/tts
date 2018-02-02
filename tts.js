#!/usr/bin/env node
//
// Takes a text file and calls the AWS Polly API
//   to convert it to an audio file.
//
'use strict'

const debug = require('debug')('aws-tts')
const fs = require('fs-extra')
const {
  checkUsage,
  generateSpeech,
  getSpinner,
  readText,
  sanitizeOpts,
  splitText
} = require('./lib')

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

let spinner = getSpinner()

// Check the usage.
checkUsage(args, process)

// Generate the audio file.
readText(input, process).then(text => {
  return splitText(text, maxCharacterCount, args)
}).then(parts => {
  return generateSpeech(parts, args)
}).then(tempFile => {
  debug(`copying ${tempFile} to ${outputFilename}`)
  fs.move(tempFile, outputFilename, { overwrite: true }, () => {
    spinner.succeed(`Done. Saved to ${outputFilename}`)
  })
}).catch(err => {
  spinner.info(err.message)
})
