#!/usr/bin/env node
//
// Takes a text file and calls the AWS Polly API
//   to convert it to an audio file.
//
'use strict';

const fs = require('fs-extra');
const {
  checkUsage,
  generateSpeech,
  getSpinner,
  readText,
  splitText
} = require('./lib');

const args = require('minimist')(process.argv.slice(2));
const maxCharacterCount = 1500;

let [input, outputFilename] = args._;

// If only 1 argument was given, use that for the output filename.
if (!outputFilename) {
  outputFilename = input;
  input = null;
}

let spinner = getSpinner();

// Check the usage.
checkUsage(args, process);

// Generate the audio file.
readText(input, process).then(text => {
  return splitText(text, maxCharacterCount, args);
}).then(parts => {
  return generateSpeech(parts, args);
}).then(tempFile => {
  fs.move(tempFile, outputFilename, { overwrite: true }, () => {
    spinner.succeed(`Done. Saved to ${outputFilename}`);
  });
}).catch(err => {
  spinner.info(err.message);
});
