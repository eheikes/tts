const debug = require('debug')('provider')
const EventEmitter = require('events')
const { readFileSync } = require('fs')
const { readFile, rm } = require('fs/promises')
const tempfile = require('tempfile')
const { combine } = require('./combine')
const { createManifest } = require('./create-manifest')
const { generateAll } = require('./generate-all')
const { splitText } = require('./split-text')

class ProviderEmitter extends EventEmitter {}

/**
 * Abstract base class for providers.
 * @abstract
 */
class Provider {
  constructor (opts = {}) {
    this.events = new ProviderEmitter()
    this.name = '[Base Provider]'
    this.maxCharacterCount = 1500
    this.opts = opts

    // Prevent instantiation of the abstract class.
    if (this.constructor === Provider) {
      throw new Error('Can\'t instantiate abstract class')
    }

    // Add a default error handler for the events.
    // This prevents unhandled errors from crashing the process.
    this.events.on('error', (err) => {
      debug(`Error event in ${this.name}:`, err)
    })

    // Load the private key from a file if specified.
    if (this.opts.privateKeyFile) {
      debug(`Reading private key from ${this.opts.privateKeyFile}`)
      this.opts.privateKey = readFileSync(this.opts.privateKeyFile, 'utf8')
    }
  }

  /**
   * Deletes the manifest and its files.
   */
  async cleanup (manifestFile) {
    const manifest = await readFile(manifestFile, 'utf8')
    debug(`Manifest is:\n${manifest}`)
    const regexpState = /^file\s+'(.*)'$/gm
    let match
    while ((match = regexpState.exec(manifest)) !== null) {
      debug(`Deleting temporary file ${match[1]}`)
      rm(match[1], { force: true, recursive: true })
    }
    debug(`Deleting manifest file ${manifestFile}`)
    rm(manifestFile, { force: true, recursive: true })
    debug('Emitting "clean" event')
    this.events.emit('clean')
  }

  async combine (manifestFile, newFile) {
    return combine(manifestFile, newFile, 'encoded', this.opts.ffmpeg)
  }

  async combineAudio (manifestFile) {
    const newFile = tempfile(`.${this.extensionFor(this.opts.format)}`)
    await this.combine(manifestFile, newFile)
    const eventData = { filename: newFile }
    debug(`Emitting "save" event: ${JSON.stringify(eventData)}`)
    this.events.emit('save', eventData)
    return newFile
  }

  /**
   * Converts text to audio speech.
   * This method runs all of the necessary subtasks.
   *
   * Returns a promise that resolves with the audio filename.
   */
  async convert (text) {
    const parts = await this.splitText(text)
    const manifestFile = await this.generateSpeech(parts)
    const tempFile = await this.combineAudio(manifestFile)
    await this.cleanup(manifestFile)
    return tempFile
  }

  /**
   * This should be overridden by subclasses to return the file extension for the given format.
   * The ffmpeg library uses it for its processing.
   */
  extensionFor (_format) {
    return 'mp3'
  }

  /**
   * This should be overridden by subclasses.
   * It should return a Promise that resolves with an object containing the
   *   audio filename (in a `tempfile` key).
   */
  async generate (_str) {
    throw new Error('generate() not implemented')
  }

  /**
   * Returns a Promise with the temporary audio file.
   */
  async generateSpeech (strParts) {
    let numComplete = 0
    const updatedParts = await generateAll(
      strParts,
      this.opts.throttle,
      async (str, _i) => {
        const info = await this.generate(str)
        numComplete++
        const eventData = { count: strParts.length, complete: numComplete, filename: info.tempfile }
        debug(`Emitting "generate" event: ${JSON.stringify(eventData)}`)
        this.events.emit('generate', eventData)
        return info
      }
    )
    const manifestFile = await createManifest(updatedParts)
    const eventData = { filename: manifestFile }
    debug(`Emitting "manifest" event: ${JSON.stringify(eventData)}`)
    this.events.emit('manifest', eventData)
    return manifestFile
  }

  async splitText (text) {
    const parts = await splitText(text, this.maxCharacterCount, this.opts.type)
    const eventData = { length: text.length, count: parts.length }
    debug(`Emitting "split" event: ${JSON.stringify(eventData)}`)
    this.events.emit('split', eventData)
    return parts
  }
}

exports.Provider = Provider
exports.ProviderEmitter = ProviderEmitter
