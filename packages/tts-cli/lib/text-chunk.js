const { split } = require('sentence-splitter')

const splitIntoSentences = (text) => {
  if (typeof text !== 'string') { return [] }
  return split(text)
    .filter((node) => node.type === 'Sentence')
    .map((node) => node.raw)
}

/**
 * Splits a block of text into groups no longer than `maxLength` characters,
 * using sentence boundaries.
 *
 * Sticks as many sentences into a single group of chars as possible,
 * without going over your specified limit.
 */
const chunkText = (text, maxLength) => {
  const sentences = splitIntoSentences(text)
  const epsilon = 100

  // Loop through the sentences, putting them into chunks.
  const chunks = []
  let chunk = ''
  let safety = 0
  for (let i = 0; i < sentences.length;) {
    if (sentences[i].length > maxLength) {
      // The sentence is too long -- break it up.
      chunk = ''
      const words = sentences[i].split(/ +/g)
      let safety3 = 0
      for (let j = 0; j < words.length;) {
        // Add the word to the chunk if it'll fit.
        // Otherwise, add the current chunk to the list and restart the chunk.
        const newWordWithSpace = `${chunk.length > 0 ? ' ' : ''}${words[j]}`
        if (`${chunk}${newWordWithSpace}`.length > maxLength) {
          // If the word is longer than the max length, split it up.
          if (words[j].length > maxLength) {
            const numChars = maxLength - chunk.length
            chunk += newWordWithSpace.slice(0, numChars)
            words[j] = newWordWithSpace.slice(numChars).trim()
          }
          chunks.push(chunk)
          chunk = ''
        } else {
          chunk += newWordWithSpace
          j++
        }
        safety3++
        if (safety3 > words.length + epsilon) { throw new Error('Infinite loop') }
      }

      // If there is an unfilled chunk remaining, add it to the list.
      if (chunk !== '') {
        chunks.push(chunk)
      }

      i++
    } else {
      // Add as many sentences that will fit in a chunk.
      chunk = ''
      let safety2 = 0
      while (i < sentences.length) {
        const newChunk = `${chunk.length > 0 ? ' ' : ''}${sentences[i]}`
        if (`${chunk}${newChunk}`.length > maxLength) { break }
        chunk += newChunk
        i++
        safety2++
        if (safety2 > sentences.length + epsilon) { throw new Error('Infinite loop') }
      }
      chunks.push(chunk)
    }
    safety++
    if (safety > sentences.length + epsilon) { throw new Error('Infinite loop') }
  }

  return chunks
}

module.exports = {
  chunkText,
  splitIntoSentences
}
