const { AwsProvider } = require('./lib/providers/aws')
const { GcpProvider } = require('./lib/providers/gcp')
const { combine } = require('./lib/combine')
const { createManifest } = require('./lib/create-manifest')
const { createProvider } = require('./lib/create-provider')
const { generateAll } = require('./lib/generate-all')
const { Provider, ProviderEmitter } = require('./lib/provider')
const { splitText } = require('./lib/split-text')

module.exports = {
  AwsProvider,
  combine,
  createManifest,
  createProvider,
  GcpProvider,
  generateAll,
  Provider,
  ProviderEmitter,
  splitText
}
