import { Readable } from 'stream'
import { SupportedProvider } from '../../src/providers/supported'
import { createSpeechStream } from '../../src/speech-stream'
import * as Provider from '../../src/providers/aws'

const mockGenerate = jest.fn()
jest.mock('../../src/providers/aws', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        generate: mockGenerate.mockReturnValue(new Readable())
      }
    })
  }
})

describe('createSpeechStream()', () => {
  const MockProvider = Provider.default as jest.Mock<Provider.default>

  beforeEach(() => {
    MockProvider.mockClear()
    mockGenerate.mockClear()
  })

  it('should create a provider and call generate()', () => {
    createSpeechStream('test', { service: SupportedProvider.AWS })
    expect(MockProvider).toHaveBeenCalled()
    expect(mockGenerate).toHaveBeenCalledWith('test')
  })

  it('should return a readable stream', () => {
    const val = createSpeechStream('test', { service: SupportedProvider.AWS })
    expect(val.on).toEqual(expect.any(Function))
    expect(val.pipe).toEqual(expect.any(Function))
  })
})
