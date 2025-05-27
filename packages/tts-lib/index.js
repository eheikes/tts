const { AwsProvider } = require('./lib/providers/aws')
const { GcpProvider } = require('./lib/providers/gcp')
const { cleanup } = require('./lib/cleanup')
const { combine } = require('./lib/combine')
const { createManifest } = require('./lib/create-manifest')
const { createProvider } = require('./lib/create-provider')
const { generateAll } = require('./lib/generate-all')
const { Provider } = require('./lib/provider')
const { splitText } = require('./lib/split-text')

module.exports = {
  AwsProvider,
  cleanup,
  combine,
  createManifest,
  createProvider,
  GcpProvider,
  generateAll,
  Provider,
  splitText
}
