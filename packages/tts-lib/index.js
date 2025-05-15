const { AwsProvider } = require('./lib/providers/aws')
const { GcpProvider } = require('./lib/providers/gcp')
const { cleanup } = require('./lib/cleanup')
const { combine } = require('./lib/combine-parts')
const { createProvider } = require('./lib/create-provider')
const { createManifest, generateAll } = require('./lib/generate-speech')
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
