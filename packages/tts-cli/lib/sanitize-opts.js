exports.sanitizeOpts = (opts) => {
  const sanitizedOpts = Object.assign({}, opts)
  sanitizedOpts['access-key'] = sanitizedOpts['access-key'] ? 'XXXXXXXX' : undefined
  sanitizedOpts['secret-key'] = sanitizedOpts['secret-key'] ? 'XXXXXXXX' : undefined
  sanitizedOpts['accessKey'] = sanitizedOpts['accessKey'] ? 'XXXXXXXX' : undefined
  sanitizedOpts['privateKey'] = sanitizedOpts['privateKey'] ? 'XXXXXXXX' : undefined
  sanitizedOpts['secretKey'] = sanitizedOpts['secretKey'] ? 'XXXXXXXX' : undefined
  return sanitizedOpts
}
