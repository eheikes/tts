const debug = require('debug')
const textchunk = require('textchunk')

/**
 * Chunk text into pieces.
 */
const chunkText = (text, maxCharacterCount) => {
  let parts = textchunk.chunk(text, maxCharacterCount)
  debug('chunkText')(`Chunked into ${parts.length} text parts`)
  return Promise.resolve(parts)
}

/**
 * Parse and chunk XML.
 */
const chunkXml = (xml, maxCharacterCount) => {
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
    let extraTags = '' // self-closing tags
    let tags = [] // stack of open tags
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
          debug('chunkXml')('Adding unused self-closing tags:', extraTags)
          chunk = `${extraTags}${chunk}`
        }
        for (let i = tags.length - 1; i >= 0; i--) {
          debug('chunkXml')(`Wrapping chunk in ${tags[i].name} tag`)
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
      if (tagData.isSelfClosing) {
        let attrs = attributeString(tagData.attributes)
        debug('chunkXml')(`Adding "${tagData.name}" to self-closing tags`)
        extraTags += `<${tagData.name}${attrs}/>`
      } else {
        debug('chunkXml')(`Adding "${tagData.name}" to the stack`)
        tags.push(tagData)
      }
    }
    parser.onclosetag = tagName => {
      debug('chunkXml')(`Found closing tag: "${tagName}"`)
      /* istanbul ignore else: need to add test for this */
      if (tags[tags.length - 1].name === tagName) {
        debug('chunkXml')(`Popping "${tagName}" from the stack`)
        tags.pop()
      } else {
        // TODO should error
        debug('chunkXml')(`Problem: mismatched tags`)
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

/**
 * Splits a string of text into chunks.
 */
exports.splitText = (ctx) => {
  const text = ctx.text
  const maxCharacterCount = ctx.maxCharacterCount
  const opts = ctx.args || {}
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
    ctx.parts = parts
  })
}
