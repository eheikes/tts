const { writeFile } = require('fs/promises')
const proxyquire = require('proxyquire')
const tempfile = require('tempfile')

const { generateAll } = require('../lib/generate-all')

describe('provider', () => {
  describe('base class', () => {
    const chunks = ['hello', 'world']
    const manifestFile = 'manifest.txt'
    const parts = ['foo.txt', 'bar.txt']
    const tempFile = 'tempfile.mp3'
    const text = 'hello world'

    let Provider
    let ChildProvider
    let childProvider
    let combineStub
    let createManifestStub
    let fsSpy
    let generateAllStub
    let splitTextStub

    beforeEach(() => {
      combineStub = jasmine.createSpy('combine').and.returnValue(manifestFile)
      createManifestStub = jasmine.createSpy('createManifest').and.returnValue(Promise.resolve(manifestFile))
      fsSpy = jasmine.createSpyObj('fs', ['readFile', 'rm'])
      generateAllStub = jasmine.createSpy('generateAll').and.returnValue(Promise.resolve(parts))
      splitTextStub = jasmine.createSpy('generateAll').and.returnValue(chunks)
      ;({ Provider } = proxyquire('../lib/provider', {
        'fs/promises': fsSpy,
        './combine': {
          combine: combineStub
        },
        './create-manifest': {
          createManifest: createManifestStub
        },
        './generate-all': {
          generateAll: generateAllStub
        },
        './split-text': {
          splitText: splitTextStub
        }
      }))
      ChildProvider = class extends Provider {
        constructor (opts = {}) {
          super(opts)
        }
      }
      childProvider = new ChildProvider({
        ffmpeg: 'ffmpeg-test',
        throttle: 10
      })
    })

    describe('constructor()', () => {
      it('should throw an error if instantiated directly', () => {
        expect(() => {
          new Provider() // eslint-disable-line no-new
        }).toThrowError(/Can't instantiate abstract class/)
      })

      it('should set a default name and maxCharacterCount', () => {
        expect(childProvider.name).toBe('[Base Provider]')
        expect(childProvider.maxCharacterCount).toBe(1500)
      })

      it('should create an event emitter', () => {
        expect(childProvider.events).toBeDefined()
        expect(childProvider.events.on).toEqual(jasmine.any(Function))
      })

      it('should create a default error handler', () => {
        expect(childProvider.events.listenerCount('error')).toBe(1)
      })

      it('should read the private key if privateKeyFile is specified', async () => {
        const keyFile = tempfile()
        await writeFile(keyFile, 'private-key-content', 'utf8')
        childProvider = new ChildProvider({
          privateKeyFile: keyFile
        })
        expect(childProvider.opts.privateKey).toBe('private-key-content')
      })
    })

    describe('cleanup()', () => {
      const manifestFilename = 'manifest.txt'
      const tempFilenames = ['foo.mp3', 'bar.mp3']

      beforeEach(() => {
        const manifestContents = tempFilenames.map(filename => `file '${filename}'`).join('\n')
        fsSpy.readFile.and.callFake(() => Promise.resolve(manifestContents))
      })

      it('should delete the manifest file', async () => {
        await childProvider.cleanup(manifestFile)
        expect(fsSpy.rm).toHaveBeenCalledWith(manifestFilename, { force: true, recursive: true })
      })

      it('should delete the temporary audio files', async () => {
        await childProvider.cleanup(manifestFile)
        for (const filename of tempFilenames) {
          expect(fsSpy.rm).toHaveBeenCalledWith(filename, { force: true, recursive: true })
        }
      })

      it('should emit a "clean" event', async () => {
        const cleanSpy = jasmine.createSpy('clean')
        childProvider.events.on('clean', cleanSpy)
        await childProvider.cleanup(manifestFile)
        expect(cleanSpy).toHaveBeenCalled()
      })
    })

    describe('combine()', () => {
      it('should call combine() for the audio', async () => {
        await childProvider.combine('manifest.txt', 'foo.mp3')
        expect(combineStub).toHaveBeenCalledWith('manifest.txt', 'foo.mp3', 'encoded', 'ffmpeg-test')
      })
    })

    describe('combineAudio()', () => {
      it('should call combine()', async () => {
        spyOn(childProvider, 'combine')
        await childProvider.combineAudio('foobar')
        expect(childProvider.combine).toHaveBeenCalledWith('foobar', jasmine.any(String))
      })

      it('should emit a "save" event with the new filename', async () => {
        const saveSpy = jasmine.createSpy('save')
        childProvider.events.on('save', saveSpy)
        await childProvider.combineAudio('foobar')
        expect(saveSpy).toHaveBeenCalledWith({ filename: jasmine.any(String) })
      })

      it('should return the combine() result', async () => {
        const result = await childProvider.combineAudio('foobar')
        expect(result).toEqual(jasmine.any(String))
      })
    })

    describe('convert()', () => {
      beforeEach(async () => {
        spyOn(childProvider, 'splitText').and.returnValue(Promise.resolve(chunks))
        spyOn(childProvider, 'generateSpeech').and.returnValue(Promise.resolve(manifestFile))
        spyOn(childProvider, 'combineAudio').and.returnValue(Promise.resolve(tempFile))
        spyOn(childProvider, 'cleanup')
        await childProvider.convert(text)
      })

      it('should call splitText() with the text', async () => {
        expect(childProvider.splitText).toHaveBeenCalledWith(text)
      })

      it('should call generateSpeech() with the text chunks', async () => {
        expect(childProvider.generateSpeech).toHaveBeenCalledWith(chunks)
      })

      it('should call combineAudio() with the manifest file', async () => {
        expect(childProvider.combineAudio).toHaveBeenCalledWith(manifestFile)
      })

      it('should call cleanup() with the manifest file', async () => {
        expect(childProvider.cleanup).toHaveBeenCalledWith(manifestFile)
      })

      it('should return the final audio filename', async () => {
        const result = await childProvider.convert(text)
        expect(result).toBe(tempFile)
      })
    })

    describe('extensionFor()', () => {
      it('should default to mp3', () => {
        const result = childProvider.extensionFor('aaa')
        expect(result).toBe('mp3')
      })
    })

    describe('generate()', () => {
      it('should throw an error', async () => {
        try {
          await childProvider.generate()
          throw new Error('generate() should ahve thrown error')
        } catch (err) {
          expect(err.message).toBe('generate() not implemented')
        }
      })
    })

    describe('generateSpeech()', () => {
      it('should call generateAll()', async () => {
        await childProvider.generateSpeech(chunks)
        expect(generateAllStub).toHaveBeenCalledWith(chunks, childProvider.opts.throttle, jasmine.any(Function))
      })

      it('should call generate() for each chunk', async () => {
        spyOn(childProvider, 'generate').and.returnValue(Promise.resolve({ tempfile: tempFile }))
        generateAllStub.and.callFake((parts, limit, func) => generateAll(parts, limit, func))
        await childProvider.generateSpeech(chunks)
        expect(childProvider.generate.calls.count()).toBe(chunks.length)
        for (const chunk of chunks) {
          expect(childProvider.generate).toHaveBeenCalledWith(chunk)
        }
      })

      it('should emit a "generate" event for each chunk', async () => {
        spyOn(childProvider, 'generate').and.returnValue(Promise.resolve({ tempfile: tempFile }))
        generateAllStub.and.callFake((parts, limit, func) => generateAll(parts, limit, func))
        const generateEventHandler = jasmine.createSpy('generate')
        childProvider.events.on('generate', generateEventHandler)
        await childProvider.generateSpeech(chunks)
        expect(generateEventHandler.calls.count()).toBe(chunks.length)
        expect(generateEventHandler).toHaveBeenCalledWith({
          count: 2,
          complete: 1,
          filename: tempFile
        })
        expect(generateEventHandler).toHaveBeenCalledWith({
          count: 2,
          complete: 2,
          filename: tempFile
        })
      })

      it('should call createManifest()', async () => {
        await childProvider.generateSpeech(chunks)
        expect(createManifestStub).toHaveBeenCalledWith(parts)
      })

      it('should emit a "manifest" event with the manifest filename', async () => {
        const manifestSpy = jasmine.createSpy('manifest')
        childProvider.events.on('manifest', manifestSpy)
        await childProvider.generateSpeech(chunks)
        expect(manifestSpy).toHaveBeenCalledWith({ filename: manifestFile })
      })

      it('should return the manifest file', async () => {
        const result = await childProvider.generateSpeech(chunks)
        expect(result).toBe(manifestFile)
      })
    })

    describe('splitText()', () => {
      it('should call the splitText routine with the correct parameters', async () => {
        await childProvider.splitText(text)
        expect(splitTextStub).toHaveBeenCalledWith(text, childProvider.maxCharacterCount, childProvider.opts.type)
      })

      it('should emit a "split" event with the text length and chunk count', async () => {
        const splitSpy = jasmine.createSpy('split')
        childProvider.events.on('split', splitSpy)
        await childProvider.splitText(text)
        expect(splitSpy).toHaveBeenCalledWith({ length: text.length, count: chunks.length })
      })

      it('should return the splitText() result', async () => {
        const result = await childProvider.splitText(text)
        expect(result).toEqual(chunks)
      })
    })
  })
})
