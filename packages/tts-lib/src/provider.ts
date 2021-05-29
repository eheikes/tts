import { mapLimit } from 'async'
import { Readable } from 'stream'
import * as tempy from 'tempy'
import { debug } from './debug'
import { combineEncodedAudio, combineRawAudio } from './combine'
import { GeneratedPart } from './generated-part'
import { createManifest } from './manifest'
import { defaultOptions, SpeechOptions, SpeechOptionsWithDefaults } from './options'
import { readStream } from './read-stream'
import { SpeechResult } from './speech-result'
import { chunkText, chunkXml } from './split'
import { StreamEvent } from './stream-event'

export type ProviderConstructor = {
  new(opts?: SpeechOptions): Provider
}

export abstract class Provider {
  /** The maximum number of characters the provider can send in a request. */
  readonly maxCharacterCount: number = Infinity

  private opts: SpeechOptionsWithDefaults
  private stream: Readable

  constructor (opts: SpeechOptions = {}) {
    this.opts = {
      ...defaultOptions,
      ...opts
    }
    this.stream = new Readable()
  }

  /**
   * Creates a SpeechResult to be emitted from the stream.
   */
  private async buildResult (audioFilename: string): Promise<SpeechResult> {
    return {
      filename: audioFilename
    }
  }

  /**
   * Combines parts into a single audio file.
   */
  private async combineParts (manifestFilename: string): Promise<string> {
    const newFile = tempy.file({ extension: this.getFileExtension() })
    debug('combineParts')(`Combining files into ${newFile}`)
    if (this.opts.format === 'pcm') {
      await combineRawAudio(manifestFilename, newFile)
    } else {
      await combineEncodedAudio(this.opts.ffmpeg, manifestFilename, newFile)
    }
    return newFile
  }

  /**
   * Makes sure the source text is a string.
   */
  private async convertToString (source: string | Readable): Promise<string> {
    if (typeof source === 'string') { return source }
    return readStream(source)
  }

  /**
   * Returns a function to emit a StreamEvent, with a data argument.
   */
  private async emit <T>(event: StreamEvent, arg: T): Promise<T> {
    this.stream?.emit(event, arg)
    return arg
  }

  /**
   * General implementation to generate speech.
   * Child providers generally should not have to implement this function.
   */
  generate (source: string | Readable): Readable {
    this.convertToString(source)
      .then(this.split.bind(this))
      .then(chunks => this.emit(StreamEvent.Split, chunks))
      .then(this.generateAllParts.bind(this))
      .then(parts => this.emit(StreamEvent.End, parts))
      .then(createManifest)
      .then(this.combineParts.bind(this))
      .then(filename => this.emit(StreamEvent.Save, filename))
      .then(this.buildResult.bind(this))
      .then(result => this.emit(StreamEvent.Finish, result))
      .catch(err => this.emit(StreamEvent.Error, err))
    return this.stream
  }

  /**
   * Generate the speech, piece by piece.
   * For each piece, emits a StreamEvent.Data event with the GeneratedPart.
   */
  private generateAllParts (chunks: string[]): Promise<GeneratedPart[]> {
    const generatePart = async (chunk: string): Promise<GeneratedPart> => {
      const part = await this.generatePart(chunk)
      this.emit(StreamEvent.Data, part)
      return part
    }
    debug('generateAllParts')(`Requesting ${chunks.length} audio segments, ${this.opts.limit} at a time`)
    return mapLimit<string, GeneratedPart>(chunks, this.opts.limit, generatePart).then(parts => {
      debug('generateAllParts')(`Requested all parts`)
      return parts
    })
  }

  /**
   * Calls the provider service and returns the part with the generated speech.
   * This function should be implemented by the child provider.
   */
  abstract generatePart (text: string): Promise<GeneratedPart>

  /**
   * Returns file extension that should be used for the audio file.
   */
  getFileExtension (): string {
    if (this.opts.format === 'mp3') {
      return 'mp3'
    } else if (this.opts.format === 'ogg' || this.opts.format === 'ogg_vorbis') {
      return 'ogg'
    } else if (this.opts.format === 'pcm') {
      return 'pcm'
    }
    throw new Error(`No known file extension for "${this.opts.format}" format`)
  }

  /**
   * Proxies the event handler for the stream.
   */
  on (event: StreamEvent, callback: (...args: any[]) => void) {
    return this.stream.on(event, callback)
  }

  /**
   * Splits up the source text.
   */
  private split (text: string): Promise<string[]> {
    const chunker = this.opts.type === 'ssml' ? chunkXml : chunkText
    return chunker(text, this.maxCharacterCount)
  }
}
