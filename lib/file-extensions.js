exports.extensionFor = (format, service) => {
  if (format === 'mp3') {
    return 'mp3'
  } else if (format === 'ogg' || format === 'ogg_vorbis') {
    return 'ogg'
  } else if (format === 'pcm') {
    return service === 'gcp' ? 'wav' : 'pcm'
  }
  throw new Error(`No known file extension for "${format}" format`)
}
