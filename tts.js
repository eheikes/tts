#!/usr/bin/env node
//
// Takes a text file and calls the AWS Polly API
//   to convert it to an audio file.
//
'use strict';

const fs = require('fs-extra');
const textchunk = require('textchunk');
const { checkUsage, compressSpace, generateSpeech, getSpinner, trim } = require('./lib');

const args = require('minimist')(process.argv.slice(2));
const inputFilename = args._[0];
const outputFilename = args._[1];
const maxCharacterCount = 1500;

let spinner = getSpinner();

// Check the usage.
checkUsage(args);

// Read in the file.
spinner.begin('Reading text');
let text = fs.readFileSync(inputFilename, 'utf8');
spinner.end();

// Split the text into chunks.
spinner.begin('Splitting text');
let parts = textchunk.chunk(text, maxCharacterCount);
parts = parts.map(compressSpace).map(trim); // compress the white space
spinner.end();

// Generate the audio file.
generateSpeech(parts, { limit: 5 }).then(tempFile => {
  fs.move(tempFile, outputFilename, { overwrite: true }, () => {
    spinner.succeed(`Done. Saved to ${outputFilename}`);
  });
});
