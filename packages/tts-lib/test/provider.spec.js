const proxyquire = require('proxyquire')

describe('provider', () => {
  describe('base class', () => {
    const chunks = ['hello', 'world']
    const manifestFile = 'manifest.txt'
    const parts = ['foo.txt', 'bar.txt']
    const text = 'hello world'

    let Provider
    let childProvider
    let combineStub
    let createManifestStub
    let generateAllStub
    let splitTextStub

    beforeEach(() => {
      combineStub = jasmine.createSpy('combine').and.returnValue(manifestFile)
      createManifestStub = jasmine.createSpy('createManifest').and.returnValue(Promise.resolve(manifestFile))
      generateAllStub = jasmine.createSpy('generateAll').and.returnValue(Promise.resolve(parts))
      splitTextStub = jasmine.createSpy('generateAll').and.returnValue(chunks)
      ;({ Provider } = proxyquire('../lib/provider', {
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
      class ChildProvider extends Provider {
        constructor (opts = {}) {
          super(opts)
        }
      }
      childProvider = new ChildProvider({
        ffmpeg: 'ffmpeg-test',
        limit: 10
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
    })

    describe('buildInfo()', () => {
      it('should return an object with the text and a tempfile', () => {
        const task = {}
        const result = childProvider.buildInfo(text, task)
        expect(result).toEqual({
          opts: { ffmpeg: 'ffmpeg-test', limit: 10 },
          task,
          tempfile: jasmine.any(String),
          text
        })
      })
    })

    describe('combineAudio()', () => {
      it('should call combine() for the audio', async () => {
        await childProvider.combineAudio('foobar')
        const args = combineStub.calls.mostRecent().args
        expect(args[0]).toBe('foobar')
        expect(args[1]).toMatch(/\.mp3$/)
        expect(args[2]).toBe('encoded')
        expect(args[3]).toBe('ffmpeg-test')
      })

      it('should return the combine() result', async () => {
        const result = await childProvider.combineAudio('foobar')
        expect(result).toBe(manifestFile)
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
        const task = {}
        await childProvider.generateSpeech(chunks, task)
        expect(generateAllStub).toHaveBeenCalledWith([{
          opts: jasmine.any(Object),
          task,
          tempfile: jasmine.any(String),
          text: chunks[0]
        }, {
          opts: jasmine.any(Object),
          task,
          tempfile: jasmine.any(String),
          text: chunks[1]
        }], childProvider.opts.limit, jasmine.any(Function), task)
      })

      it('should call createManifest()', async () => {
        await childProvider.generateSpeech(chunks, {})
        expect(createManifestStub).toHaveBeenCalledWith(parts)
      })

      it('should return the manifest file', async () => {
        const result = await childProvider.generateSpeech(chunks, {})
        expect(result).toBe(manifestFile)
      })
    })

    describe('splitText()', () => {
      it('should call the splitText routine with the correct parameters', () => {
        childProvider.splitText(text)
        expect(splitTextStub).toHaveBeenCalledWith(text, childProvider.maxCharacterCount, childProvider.opts.type)
      })

      it('should return the splitText() result', () => {
        const result = childProvider.splitText(text)
        expect(result).toEqual(chunks)
      })
    })
  })
})
