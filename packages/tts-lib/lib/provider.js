const tempfile = require('tempfile')
const { combine } = require('./combine')
const { createManifest, generateAll } = require('./generate-all')
const { splitText } = require('./split-text')

/**
 * Abstract base class for providers.
 * @abstract
 */
class Provider {
  constructor (opts = {}) {
    this.name = '[Base Provider]'
    this.maxCharacterCount = 1500
    this.opts = opts
    if (this.constructor === Provider) {
      throw new Error('Can\'t instantiate abstract class')
    }
  }

  /**
   * This should be overridden by subclasses to return the data object.
   */
  buildInfo (text, task) {
    return {
      opts: this.opts,
      task,
      tempfile: tempfile(`.${this.extensionFor(this.opts.format)}`),
      text
    }
  }

  combineAudio (manifestFile) {
    const newFile = tempfile(`.${this.extensionFor(this.opts.format)}`)
    return combine(manifestFile, newFile, 'encoded', this.opts.ffmpeg)
  }

  /**
   * This should be overridden by subclasses to return the file extension for the given format.
   */
  extensionFor (_format) {
    return 'mp3'
  }

  /**
   * This should be overridden by subclasses.
   */
  async generate (_info, _i) {
    throw new Error('generate() not implemented')
  }

  /**
   * Returns a Promise with the temporary audio file.
   */
  async generateSpeech (strParts, task) {
    // Compile the text parts and options together in a packet.
    const parts = strParts.map(part => this.buildInfo(part, task))
    const updatedParts = await generateAll(parts, this.opts.limit, this.generate.bind(this), task)
    return createManifest(updatedParts)
  }

  splitText (text) {
    return splitText(text, this.maxCharacterCount, this.opts.type)
  }
}

exports.Provider = Provider
