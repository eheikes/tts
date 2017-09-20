'use strict';

const async = require('async');
const fs = require('fs-extra');
const got = require('got');
const ora = require('ora');
const path = require('path');
const Polly = require('aws-sdk/clients/polly').Presigner;
const spawn = require('child_process').spawn;
const tempfile = require('tempfile');
const textchunk = require('textchunk');

const fileExtensions = {
  mp3: 'mp3',
  ogg_vorbis: 'ogg', // eslint-disable-line camelcase
  pcm: 'pcm',
};

// Set up the spinner.
let spinner = ora().start();
spinner.begin = text => {
  spinner.text = text;
  spinner.start();
};
spinner.end = () => {
  spinner.succeed();
};

exports.checkUsage = (args, proc) => {
  spinner.stop();
  const minNumArgs = 1;
  const script = path.basename(proc.argv[1]);
  const usageStatement = `Converts a text file to speech using the AWS Polly API.
Usage:
  ${script} [INPUTFILE] OUTPUTFILE [OPTIONS]
Standard:
  INPUTFILE           The text file to convert (reads from stdin if not specified)
  OUTPUTFILE          The filename to save the audio to
Options:
  --help              Displays this info and exits
  --access-key KEY    AWS access key ID
  --ffmpeg BINARY     Path to the ffmpeg binary (defaults to the one in PATH)
  --format FORMAT     Target audio format ("mp3", "ogg_vorbis", or "pcm") (default "mp3")
  --lexicon NAME      Apply a stored pronunciation lexicon. Can be specified multiple times.
  --region REGION     AWS region to send requests to (default "us-east-1")
  --sample-rate RATE  Audio frequency, in hertz.
  --secret-key KEY    AWS secret access key
  --throttle SIZE     Number of simultaneous requests allowed against the AWS API (default 5)
  --type TYPE         Type of input text ("text" or "ssml") (default "text")
  --voice VOICE       Voice to use for the speech (default "Joanna")
`;
  if (args.help) {
    proc.stderr.write(usageStatement);
    proc.exit(0);
  }
  if (args._.length < minNumArgs) {
    proc.stderr.write(usageStatement);
    proc.exit(1);
  }
};

// Creates an object containing all the data.
let buildInfo = (text, urlCreator, opts) => {
  return {
    opts: opts,
    tempfile: tempfile(`.${fileExtensions[opts.format]}`),
    text: text,
    urlcreator: urlCreator,
  };
};

// Calls AWS Polly with the given info.
let callAws = (info, i, callback) => {
  const secsPerMin = 60;
  const minsInHalfHour = 30;
  const halfHour = secsPerMin * minsInHalfHour;

  spinner.text = spinner.text.replace(/\d+\//, `${i}/`);

  let url = info.urlcreator({
    LexiconNames: info.opts.lexicon,
    OutputFormat: info.opts.format,
    SampleRate: info.opts['sample-rate'] ? String(info.opts['sample-rate']) : undefined,
    Text: info.text,
    TextType: info.opts.type,
    VoiceId: info.opts.voice
  }, halfHour);

  let error;
  let outputStream = fs.createWriteStream(info.tempfile);
  outputStream.on('close', () => { callback(error); });
  got.stream(url).on('error', err => { error = err; }).pipe(outputStream);
};

// Deletes the manifest and its files.
let cleanup = manifestFile => {
  let manifest = fs.readFileSync(manifestFile, 'utf8');
  let regexpState = /^file\s+'(.*)'$/gm;
  let match;
  while ((match = regexpState.exec(manifest)) !== null) {
    fs.removeSync(match[1]);
  }
  fs.removeSync(manifestFile);
};

// Combines MP3 or OGG files into one file.
let combineEncodedAudio = (binary, manifestFile, outputFile) => {
  let args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', manifestFile,
    '-c', 'copy',
    outputFile
  ];
  return new Promise((resolve, reject) => {
    let ffmpeg = spawn(binary, args);
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += `\n${data}`;
    });
    ffmpeg.on('error', err => {
      reject(new Error('Could not start ffmpeg process'));
    });
    ffmpeg.on('close', code => {
      if (code > 0) {
        spinner.fail();
        return reject(new Error(`ffmpeg returned an error (${code}): ${stderr}`));
      }
      spinner.end();
      resolve();
    });
  });
};

// Concatenates raw PCM audio into one file.
let combineRawAudio = (manifestFile, outputFile) => {
  let manifest = fs.readFileSync(manifestFile, 'utf8');
  let regexpState = /^file\s+'(.*)'$/gm;
  fs.createFileSync(outputFile);
  fs.truncateSync(outputFile);
  let match;
  while ((match = regexpState.exec(manifest)) !== null) {
    let dataBuffer = fs.readFileSync(match[1]);
    fs.appendFileSync(outputFile, dataBuffer);
  }
  return Promise.resolve();
};

// Combines all the parts into one file.
// Resolves with the new filename.
let combine = (manifestFile, opts) => {
  spinner.begin('Combine audio');
  let newFile = tempfile(`.${fileExtensions[opts.format]}`);
  let combiner = opts.format === 'pcm' ?
    combineRawAudio(manifestFile, newFile) :
    combineEncodedAudio(opts.ffmpeg, manifestFile, newFile);
  return combiner.then(() => {
    spinner.begin('Clean up');
    cleanup(manifestFile);
    spinner.end();
    return newFile;
  }).catch(err => {
    cleanup(manifestFile);
    throw err;
  });
};

// Writes down all the temp files for ffmpeg to read in.
// Returns the text filename.
let createManifest = parts => {
  let txtFile = tempfile('.txt');
  let contents = parts.map(info => {
    return `file '${info.tempfile}'`;
  }).join('\n');
  fs.writeFileSync(txtFile, contents, 'utf8');
  return txtFile;
};

// Create an AWS Polly instance.
let createPolly = opts => {
  return new Polly({
    apiVersion: '2016-06-10',
    region: opts.region,
    accessKeyId: opts['access-key'],
    secretAccessKey: opts['secret-key'],
  });
};

// Calls the API for each text part (throttled). Returns a Promise.
let generateAll = (parts, opts, func) => {
  let count = parts.length;
  spinner.begin(`Convert to audio (0/${count})`);
  return (new Promise((resolve, reject) => {
    async.eachOfLimit(
      parts,
      opts.limit,
      func,
      err => {
        if (err) {
          spinner.fail();
          return reject(err);
        }
        spinner.text = spinner.text.replace(/\d+\//, `${count}/`);
        spinner.end();
        resolve(parts);
      }
    );
  }));
};

// Returns a Promise with the temporary audio file.
exports.generateSpeech = (strParts, opts) => {
  // Add in the default options.
  opts = Object.assign({}, {
    'access-key': opts.accessKey,
    ffmpeg: opts.ffmpeg || 'ffmpeg',
    format: opts.format || 'mp3',
    lexicon: opts.lexicon,
    limit: Number(opts.throttle) || 5, // eslint-disable-line no-magic-numbers
    region: opts.region || 'us-east-1',
    'sample-rate': opts.sampleRate,
    'secret-key': opts.secretKey,
    type: opts.type || 'text',
    voice: opts.voice || 'Joanna'
  }, opts);
  if (typeof opts.lexicon !== 'undefined' && !Array.isArray(opts.lexicon)) {
    opts.lexicon = [opts.lexicon];
  }

  let polly = createPolly(opts);

  // Compile the text parts and options together in a packet.
  let parts = strParts.map(part => buildInfo(part, polly.getSynthesizeSpeechUrl.bind(polly), opts));

  return generateAll(parts, opts, callAws)
    .then(createManifest)
    .then(manifest => {
      return combine(manifest, opts);
    });
};

exports.getSpinner = () => {
  return spinner;
};

// Read in the text from a file.
// If no file is specified, read from stdin.
exports.readText = (inputFilename, proc) => {
  spinner.begin('Reading text');
  return new Promise((resolve, reject) => {
    if (inputFilename) {
      // Read from a file.
      fs.readFile(inputFilename, 'utf8', (err, data) => {
        if (err) { return reject(err); }
        resolve(data);
      });
    } else {
      // Read from stdin.
      let data = '';
      proc.stdin.setEncoding('utf8');
      proc.stdin.on('readable', () => {
        let chunk = proc.stdin.read();
        if (chunk !== null) { data += chunk; }
      });
      proc.stdin.on('end', () => {
        resolve(data);
      });
    }
  }).then(text => {
    spinner.end();
    return text;
  });
};

// Splits a string of text into chunks.
exports.splitText = (text, maxCharacterCount) => {
  spinner.begin('Splitting text');
  let parts = textchunk.chunk(text, maxCharacterCount);
  parts = parts.map(str => {
    // Compress whitespace.
    return str.replace(/\s+/g, ' ');
  }).map(str => {
    // Trim whitespace from the ends.
    return str.trim();
  });
  spinner.end();
  return Promise.resolve(parts);
};

// Expose the internal functions when testing.
if (process.env.JASMINE_CONFIG_PATH) {
  exports.buildInfo = buildInfo;
  exports.callAws = callAws;
  exports.cleanup = cleanup;
  exports.combine = combine;
  exports.combineEncodedAudio = combineEncodedAudio;
  exports.combineRawAudio = combineRawAudio;
  exports.createManifest = createManifest;
  exports.createPolly = createPolly;
  exports.generateAll = generateAll;
}
