import { promises as fsPromises } from 'fs'
import * as tempy from 'tempy'
import { debug } from './debug'
import { GeneratedPart } from './generated-part'

/**
 * Writes down all the temp files for ffmpeg to read in.
 * Returns the text filename.
 */
export const createManifest = async (parts: GeneratedPart[]): Promise<string> => {
  const txtFile = tempy.file({ extension: 'txt' })
  debug('createManifest')(`Creating ${txtFile} for manifest`)
  const contents = parts.map(info => {
    return `file '${info.filename}'`
  }).join('\n')
  debug('createManifest')(`Writing manifest contents:\n${contents}`)
  await fsPromises.writeFile(txtFile, contents, 'utf8')
  return txtFile
}
