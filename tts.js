#!/usr/bin/env node
//
// Takes a text file and calls the AWS Polly API
//   to convert it to an audio file.
//
'use strict';

const fs = require('fs-extra');
const textchunk = require('textchunk');
const { checkUsage, compressSpace, generateSpeech, trim } = require('./lib');

const args = require('minimist')(process.argv.slice(2));
const inputFilename = args._[0];
const outputFilename = args._[1];
const maxCharacterCount = 1500;

// Check the usage.
checkUsage(args);

// Read in the file.
let text = fs.readFileSync(inputFilename, 'utf8');

// Split the text into chunks.
let parts = textchunk.chunk(text, maxCharacterCount);

// Compress the white space to minimize the payload.
parts = parts.map(compressSpace).map(trim);

// Generate the audio file.
generateSpeech(parts, { limit: 5 }).then(tempFile => {
  fs.move(tempFile, outputFilename, { overwrite: true }, () => {
    console.log(`Done. Saved to ${outputFilename}`);
  });
});
