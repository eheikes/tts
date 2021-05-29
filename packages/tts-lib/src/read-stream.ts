import { Readable } from 'stream'

export const readStream = async (stream: Readable): Promise<string> => {
  let data = ''
  for await (const chunk of stream) {
    data += chunk
  }
  return data
}
