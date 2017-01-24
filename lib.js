'use strict';

const async = require('async');
const fs = require('fs-extra');
const got = require('got');
const path = require('path');
const Polly = require('aws-sdk/clients/polly').Presigner;
const spawn = require('child_process').spawn;
const tempfile = require('tempfile');

exports.checkUsage = args => {
  const minNumArgs = 2;
  const script = path.basename(process.argv[1]);
  const usageStatement = `Usage: ${script} inputfile outputfile
`;
  if (args._.length < minNumArgs) {
    process.stderr.write(usageStatement);
    process.exit(1);
  }
};

exports.compressSpace = str => {
  return str.replace(/\s+/g, ' ');
};

// Returns a Promise with the temporary audio file.
exports.generateSpeech = (strParts, opts) => {
  // Add in the default options.
  opts = Object.assign({}, {
    format: 'mp3',
    limit: 5,
    region: 'us-east-1',
    voice: 'Joanna'
  }, opts);

  const secsPerMin = 60;
  const minsInHalfHour = 30;
  const halfHour = secsPerMin * minsInHalfHour;

  // Creates an object containing all the data.
  let buildInfo = text => {
    return {
      tempfile: tempfile(`.${opts.format}`),
      text: text
    };
  };

  // Create an AWS Polly instance.
  let polly = new Polly({
    apiVersion: '2016-06-10',
    region: opts.region
  });

  // Calls AWS Polly with the given info.
  let callAws = (info, callback) => {
    let url = polly.getSynthesizeSpeechUrl({
      OutputFormat: opts.format,
      Text: info.text,
      VoiceId: opts.voice
    }, halfHour);
    let outputStream = fs.createWriteStream(info.tempfile);
    outputStream.on('error', callback);
    outputStream.on('finish', callback);
    got.stream(url).pipe(outputStream);
  };

  // Calls the API for each text part (throttled). Returns a Promise.
  let generateAll = parts => {
    return (new Promise((resolve, reject) => {
      async.eachLimit(
        parts,
        opts.limit,
        callAws,
        err => {
          if (err) { return reject(err); }
          resolve(parts);
        }
      );
    }));
  };

  // Writes down all the temp files for ffmpeg to read in.
  // Returns the text filename.
  let createManifest = parts => {
    let txtFile = tempfile('.txt');
    let contents = parts.map(info => {
      return `file ${info.tempfile}`;
    }).join('\n');
    fs.writeFileSync(txtFile, contents, 'utf8');
    return txtFile;
  };

  // Deletes the manifest and its files.
  let cleanup = manifestFile => {
    let manifest = fs.readFileSync(manifestFile, 'utf8');
    let regexpState = /^file\s+(.*)$/gm;
    let match;
    while ((match = regexpState.exec(manifest)) !== null) {
      fs.removeSync(match[1]);
    }
    fs.removeSync(manifestFile);
  };

  // Combines all the parts into one file.
  // Resolves with the new filename.
  let combine = manifestFile => {
    let newFile = tempfile(`.${opts.format}`);
    let args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', manifestFile,
      '-c', 'copy',
      newFile
    ];
    return (new Promise((resolve, reject) => {
      let ffmpeg = spawn('ffmpeg', args);
      ffmpeg.on('error', err => {
        reject(new Error('Could not start ffmpeg process'));
      });
      ffmpeg.on('close', code => {
        if (code > 0) { return reject(new Error(`ffmpeg returned an error (${code})`)); }
        resolve(newFile);
      });
    })).then(audioFile => {
      cleanup(manifestFile);
      return audioFile;
    });
  };

  // Compile the text parts and options together in a packet.
  let parts = strParts.map(buildInfo);

  return generateAll(parts)
    .then(createManifest)
    .then(combine);
};

exports.trim = str => {
  return str.trim();
};
