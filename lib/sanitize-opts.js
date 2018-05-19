exports.sanitizeOpts = (opts) => {
  const sanitizedOpts = Object.assign({}, opts)
  sanitizedOpts['access-key'] = sanitizedOpts['access-key'] ? 'XXXXXXXX' : undefined
  sanitizedOpts['secret-key'] = sanitizedOpts['secret-key'] ? 'XXXXXXXX' : undefined
  return sanitizedOpts
}
