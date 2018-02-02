'use strict'

const async = require('async')
const debug = require('debug')
const fs = require('fs-extra')
const got = require('got')
const ora = require('ora')
const path = require('path')
const Polly = require('aws-sdk/clients/polly').Presigner
const spawn = require('child_process').spawn
const tempfile = require('tempfile')
const textchunk = require('textchunk')

const fileExtensions = {
  mp3: 'mp3',
  ogg_vorbis: 'ogg', // eslint-disable-line camelcase
  pcm: 'pcm'
}

// Set up the spinner.
let spinner
/* istanbul ignore if */
if (debug('aws-tts').enabled) {
  /* eslint-disable no-console */
  spinner = {
    fail: () => {},
    info: str => {
      if (str) { console.log(str) }
    },
    start: () => { console.log(spinner.text) },
    stop: () => {},
    succeed: str => {
      if (str) { console.log(str) }
    },
    text: ''
  }
  /* eslint-enable no-console */
} else {
  spinner = ora().start()
}
spinner.begin = text => {
  spinner.text = text
  spinner.start()
}
spinner.end = () => {
  spinner.succeed()
}

exports.checkUsage = (args, proc) => {
  spinner.stop()
  const minNumArgs = 1
  const script = path.basename(proc.argv[1])
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
`
  if (args.help) {
    proc.stderr.write(usageStatement)
    proc.exit(0)
  }
  if (args._.length < minNumArgs) {
    proc.stderr.write(usageStatement)
    proc.exit(1)
  }
}

// Creates an object containing all the data.
let buildInfo = (text, urlCreator, opts) => {
  return {
    opts: opts,
    tempfile: tempfile(`.${fileExtensions[opts.format]}`),
    text: text,
    urlcreator: urlCreator
  }
}

// Calls AWS Polly with the given info.
let callAws = (info, i, callback) => {
  const secsPerMin = 60
  const minsInHalfHour = 30
  const halfHour = secsPerMin * minsInHalfHour

  spinner.text = spinner.text.replace(/\d+\//, `${i}/`)

  let url = info.urlcreator({
    LexiconNames: info.opts.lexicon,
    OutputFormat: info.opts.format,
    SampleRate: info.opts['sample-rate'] ? String(info.opts['sample-rate']) : undefined,
    Text: info.text,
    TextType: info.opts.type,
    VoiceId: info.opts.voice
  }, halfHour)

  let error
  debug('callAws')(`Opening output stream to ${info.tempfile}`)
  let outputStream = fs.createWriteStream(info.tempfile)
  outputStream.on('close', () => {
    debug('callAws')('Closing output stream')
    callback(error)
    /* istanbul ignore if */
    if (error) {
      debug('callAws')(`Error during request: ${error.message}`)
      // Get the error message from Amazon.
      try {
        let response = fs.readFileSync(info.tempfile, 'utf8')
        debug('callAws')(`Amazon responded with ${response}`)
        let parsedResponse = JSON.parse(response)
        error.message += `: ${parsedResponse.message}`
      } catch (err) {}
    }
  })
  let sanitizedUrl = url
    .replace(/(Text=.{1,10})([^&]*)/, '$1...')
    .replace(/(X-Amz-Credential=)([^&]*)/, '$1...')
    .replace(/(X-Amz-Signature=.)([^&]*)/, '$1...')
  debug('callAws')(`Making request to ${sanitizedUrl}`)
  got.stream(url).on('error', err => { error = err }).pipe(outputStream)
}

// Deletes the manifest and its files.
let cleanup = manifestFile => {
  let manifest = fs.readFileSync(manifestFile, 'utf8')
  debug('cleanup')(`Manifest is ${manifest}`)
  let regexpState = /^file\s+'(.*)'$/gm
  let match
  while ((match = regexpState.exec(manifest)) !== null) {
    debug('cleanup')(`Deleting temporary file ${match[1]}`)
    fs.removeSync(match[1])
  }
  debug('cleanup')(`Deleting manifest file ${manifestFile}`)
  fs.removeSync(manifestFile)
}

// Combines MP3 or OGG files into one file.
let combineEncodedAudio = (binary, manifestFile, outputFile) => {
  let args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', manifestFile,
    '-c', 'copy',
    outputFile
  ]
  return new Promise((resolve, reject) => {
    debug('combineEncodedAudio')(`Running ${binary} ${args.join(' ')}`)
    let ffmpeg = spawn(binary, args)
    let stderr = ''
    ffmpeg.stderr.on('data', (data) => {
      stderr += `\n${data}`
    })
    ffmpeg.on('error', () => {
      reject(new Error('Could not start ffmpeg process'))
    })
    ffmpeg.on('close', code => {
      debug('combineEncodedAudio')(stderr)
      debug('combineEncodedAudio')(`ffmpeg process completed with code ${code}`)
      if (code > 0) {
        spinner.fail()
        return reject(new Error(`ffmpeg returned an error (${code}): ${stderr}`))
      }
      spinner.end()
      resolve()
    })
  })
}

// Concatenates raw PCM audio into one file.
let combineRawAudio = (manifestFile, outputFile) => {
  let manifest = fs.readFileSync(manifestFile, 'utf8')
  debug('combineRawAudio')(`Manifest contains: ${manifest}`)
  let regexpState = /^file\s+'(.*)'$/gm
  debug('combineRawAudio')(`Creating file ${outputFile}`)
  fs.createFileSync(outputFile)
  debug('combineRawAudio')(`Truncating file ${outputFile}`)
  fs.truncateSync(outputFile)
  let match
  while ((match = regexpState.exec(manifest)) !== null) {
    debug('combineRawAudio')(`Reading data from ${match[1]}`)
    let dataBuffer = fs.readFileSync(match[1])
    debug('combineRawAudio')(`Appending data to ${outputFile}`)
    fs.appendFileSync(outputFile, dataBuffer)
  }
  return Promise.resolve()
}

// Combines all the parts into one file.
// Resolves with the new filename.
let combine = (manifestFile, opts) => {
  spinner.begin('Combine audio')
  let newFile = tempfile(`.${fileExtensions[opts.format]}`)
  debug('combine')(`Combining files into ${newFile}`)
  let combiner = opts.format === 'pcm'
    ? combineRawAudio(manifestFile, newFile)
    : combineEncodedAudio(opts.ffmpeg, manifestFile, newFile)
  return combiner.then(() => {
    spinner.begin('Clean up')
    cleanup(manifestFile)
    spinner.end()
    return newFile
  }).catch(err => {
    cleanup(manifestFile)
    throw err
  })
}

// Writes down all the temp files for ffmpeg to read in.
// Returns the text filename.
let createManifest = parts => {
  let txtFile = tempfile('.txt')
  debug('createManifest')(`Creating ${txtFile} for manifest`)
  let contents = parts.map(info => {
    return `file '${info.tempfile}'`
  }).join('\n')
  debug('createManifest')(`Writing manifest contents:\n${contents}`)
  fs.writeFileSync(txtFile, contents, 'utf8')
  return txtFile
}

// Create an AWS Polly instance.
let createPolly = opts => {
  debug('createPolly')(`Creating Polly instance in ${opts.region}`)
  return new Polly({
    apiVersion: '2016-06-10',
    region: opts.region,
    accessKeyId: opts['access-key'],
    secretAccessKey: opts['secret-key']
  })
}

// Calls the API for each text part (throttled). Returns a Promise.
let generateAll = (parts, opts, func) => {
  let count = parts.length
  spinner.begin(`Convert to audio (0/${count})`)
  return (new Promise((resolve, reject) => {
    debug('generateAll')(`Requesting ${count} audio segments, ${opts.limit} at a time`)
    async.eachOfLimit(
      parts,
      opts.limit,
      func,
      err => {
        debug('generateAll')(`Requested all parts, with error ${err}`)
        if (err) {
          spinner.fail()
          return reject(err)
        }
        spinner.text = spinner.text.replace(/\d+\//, `${count}/`)
        spinner.end()
        resolve(parts)
      }
    )
  }))
}

// Returns a Promise with the temporary audio file.
exports.generateSpeech = (strParts, opts) => {
  // Add in the default options.
  /* istanbul ignore next */
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
  }, opts)
  /* istanbul ignore next */
  if (typeof opts.lexicon !== 'undefined' && !Array.isArray(opts.lexicon)) {
    opts.lexicon = [opts.lexicon]
  }
  /* istanbul ignore next */
  debug('generateSpeech')(`Options: ${JSON.stringify(this.sanitizeOpts(opts))}`) // eslint-disable-line no-invalid-this

  /* istanbul ignore next */
  let polly = createPolly(opts)

  // Compile the text parts and options together in a packet.
  /* istanbul ignore next */
  let parts = strParts.map(part => buildInfo(part, polly.getSynthesizeSpeechUrl.bind(polly), opts))

  /* istanbul ignore next */
  return generateAll(parts, opts, callAws)
    .then(createManifest)
    .then(manifest => {
      /* istanbul ignore next */
      return combine(manifest, opts)
    })
}

exports.getSpinner = () => {
  return spinner
}

// Chunk text into pieces.
let chunkText = (text, maxCharacterCount) => {
  let parts = textchunk.chunk(text, maxCharacterCount)
  debug('chunkText')(`Chunked into ${parts.length} text parts`)
  return Promise.resolve(parts)
}

// Parse and chunk XML.
let chunkXml = (xml, maxCharacterCount) => {
  const parser = require('sax').parser(false, {
    lowercase: true,
    normalize: true,
    trim: true
  })
  debug('chunkXml')('Started SAX XML parser')
  const attributeString = attrs => {
    let str = ''
    for (let prop in attrs) {
      /* istanbul ignore else: need to add test for this */
      if (attrs.hasOwnProperty(prop)) {
        str += ` ${prop}="${attrs[prop]}"`
      }
    }
    return str
  }
  return new Promise((resolve, reject) => {
    let err = null
    let extraTags = ''
    let tags = []
    let parts = []
    /* istanbul ignore next */
    parser.onerror = e => {
      debug('chunkXml')(`Encountered error: ${e}`)
      err = e
    }
    parser.ontext = text => {
      debug('chunkXml')(`Found text: ${text.substr(0, 50)}...`) // eslint-disable-line no-magic-numbers
      let chunks = textchunk.chunk(text, maxCharacterCount).map((chunk, index) => {
        if (index === 0) {
          chunk = `${extraTags}${chunk}`
        }
        for (let i = tags.length - 1; i >= 0; i--) {
          chunk = `<${tags[i].name}${attributeString(tags[i].attributes)}>${chunk}</${tags[i].name}>`
        }
        return chunk
      })
      chunks.forEach(chunk => {
        debug('chunkXml')(`Adding chunk: ${chunk.substr(0, 50)}...`) // eslint-disable-line no-magic-numbers
      })
      parts.push(...chunks)
      extraTags = ''
    }
    parser.onopentag = tagData => {
      debug('chunkXml')(`Found tag: ${JSON.stringify(tagData)}`)
      tags.push(tagData)
    }
    parser.onclosetag = tagName => {
      debug('chunkXml')(`Found closing tag: "${tagName}"`)
      /* istanbul ignore else: need to add test for this */
      if (tags[tags.length - 1].name === tagName) {
        let attrs = attributeString(tags[tags.length - 1].attributes)
        debug('chunkXml')(`Adding "${tagName}" to extra tags and popping the stack`)
        extraTags += `<${tagName}${attrs}></${tagName}>`
        tags.pop()
      }
    }
    parser.onend = () => {
      debug('chunkXml')('Reached end of XML')
      /* istanbul ignore if */
      if (err) {
        reject(err)
      } else {
        resolve(parts)
      }
    }
    parser.write(xml).close()
  })
}

// Read in the text from a file.
// If no file is specified, read from stdin.
exports.readText = (inputFilename, proc) => {
  spinner.begin('Reading text')
  return new Promise((resolve, reject) => {
    if (inputFilename) {
      // Read from a file.
      debug('readText')(`Reading from ${inputFilename}`)
      fs.readFile(inputFilename, 'utf8', (err, data) => {
        if (err) { return reject(err) }
        debug('readText')(`Finished reading (${data.length} bytes)`)
        resolve(data)
      })
    } else {
      // Read from stdin.
      debug('readText')('Reading from stdin')
      let data = ''
      proc.stdin.setEncoding('utf8')
      proc.stdin.on('readable', () => {
        let chunk = proc.stdin.read()
        /* istanbul ignore else: need to add test for this */
        if (chunk !== null) { data += chunk }
      })
      proc.stdin.on('end', () => {
        debug('readText')(`Finished reading (${data.length} bytes)`)
        resolve(data)
      })
    }
  }).then(text => {
    spinner.end()
    return text
  })
}

/* istanbul ignore next */
exports.sanitizeOpts = (opts) => {
  const sanitizedOpts = Object.assign({}, opts)
  sanitizedOpts['access-key'] = sanitizedOpts['access-key'] ? 'XXXXXXXX' : undefined
  sanitizedOpts['secret-key'] = sanitizedOpts['secret-key'] ? 'XXXXXXXX' : undefined
  return sanitizedOpts
}

// Splits a string of text into chunks.
exports.splitText = (text, maxCharacterCount, opts) => {
  opts = opts || {}
  spinner.begin('Splitting text')
  let chunker = opts.type === 'ssml' ? chunkXml : chunkText
  return chunker(text, maxCharacterCount).then(parts => {
    debug('splitText')('Stripping whitespace')
    return parts.map(str => {
      // Compress whitespace.
      return str.replace(/\s+/g, ' ')
    }).map(str => {
      // Trim whitespace from the ends.
      return str.trim()
    })
  }).then(parts => {
    spinner.end()
    return parts
  })
}

// Expose the internal functions when testing.
/* istanbul ignore next */
if (process.env.JASMINE_CONFIG_PATH) {
  exports.buildInfo = buildInfo
  exports.callAws = callAws
  exports.cleanup = cleanup
  exports.combine = combine
  exports.combineEncodedAudio = combineEncodedAudio
  exports.combineRawAudio = combineRawAudio
  exports.createManifest = createManifest
  exports.createPolly = createPolly
  exports.generateAll = generateAll
}
