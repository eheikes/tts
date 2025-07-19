const { AwsProvider } = require('./providers/aws')
const { GcpProvider } = require('./providers/gcp')

const providers = {
  aws: AwsProvider,
  gcp: GcpProvider
}

exports.createProvider = (service, opts) => {
  if (!providers[service]) {
    throw new Error(`Unsupported service: ${service}`)
  }
  return new providers[service](opts)
}
