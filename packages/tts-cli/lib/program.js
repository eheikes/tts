const { Command, Option } = require('commander')

const packageInfo = require('../package.json')

const parseInteger = (val) => {
  return parseInt(val, 10)
}

const program = new Command()
program.description('Converts a text file to speech using AWS Polly or Google Cloud Text-to-Speech.')
program.version(packageInfo.version, '-v, --version', 'Output the current version')
program.helpOption('-h, --help', 'Display help for command')
program.argument('FILES...', 'The text file to convert (optional, reads from stdin if not specified), and the filename to save the audio to')
program.action((args, _opts, commander) => {
  if (args.length > 2) {
    console.error('error: too many arguments, expected 1 or 2')
    process.exitCode = 1
    commander.help() // will exit the program
  }
})
program.addOption(
  new Option('--access-key <KEY>', 'AWS access key ID')
    .implies({ service: 'aws' })
)
program.addOption(
  new Option('--effect <ID...>', 'Apply an audio effect profile. Can be specified multiple times.')
    .implies({ service: 'gcp' })
)
program.addOption(
  new Option('--email <EMAIL>', 'GCP client email address (required if "private-key" or "private-key-file" is used)')
    .implies({ service: 'gcp' })
)
program.addOption(
  new Option('--engine <ENGINE>', 'AWS voice engine')
    .choices(['standard', 'neural', 'generative', 'long-form'])
    .implies({ service: 'aws' })
)
program.addOption(
  new Option('--ffmpeg <BINARY>', 'Path to the ffmpeg binary (defaults to the one in PATH)')
    .default('ffmpeg')
)
program.addOption(
  new Option('--format <FORMAT>', 'Target audio format')
    .choices(['mp3', 'ogg', 'pcm'])
    .default('mp3')
)
program.addOption(
  new Option('--gain <GAIN>', 'Volume gain, where 0.0 is normal gain')
    .argParser(parseFloat)
    .implies({ service: 'gcp' })
)
program.addOption(
  new Option('--gender <GENDER>', 'Gender of the voice')
    .choices(['male', 'female', 'neutral'])
    .implies({ service: 'gcp' })
)
program.addOption(
  new Option('--language <LANG>', 'Code for the desired language (default "en-US" for GCP, no default for AWS)')
    .implies({ service: 'gcp' })
)
program.addOption(
  new Option('--lexicon <NAME...>', 'Apply a stored pronunciation lexicon. Can be specified multiple times.')
    .implies({ service: 'aws' })
)
program.addOption(
  new Option('--pitch <PITCH>', 'Change in speaking pich, in semitones')
    .argParser(parseFloat)
    .implies({ service: 'gcp' })
)
program.addOption(
  new Option('--private-key <KEY>', 'GCP private key')
    .implies({ service: 'gcp' })
)
program.addOption(
  new Option('--private-key-file <FILE>', 'GCP private key file (".pem" or ".p12" file)')
    .implies({ service: 'gcp' })
)
program.addOption(
  new Option('--project-file <FILE>', 'GCP ".json" file with project info')
    .implies({ service: 'gcp' })
)
program.addOption(
  new Option('--project-id <ID>', 'GCP project ID')
    .implies({ service: 'gcp' })
)
program.addOption(
  new Option('--region <REGION>', 'AWS region to send requests to')
    .default('us-east-1')
    .implies({ service: 'aws' })
)
program.addOption(
  new Option('--sample-rate <RATE>', 'Audio frequency, in hertz.')
    .argParser(parseFloat)
)
program.addOption(
  new Option('--secret-key <KEY>', 'AWS secret access key')
    .implies({ service: 'aws' })
)
program.addOption(
  new Option('--service <TYPE>', 'Cloud service to use ("aws" or "gcp")')
    .choices(['aws', 'gcp'])
    .default('aws')
)
program.addOption(
  new Option('--speed <RATE>', 'Speaking rate, where 1.0 is normal speed')
    .argParser(parseFloat)
    .implies({ service: 'gcp' })
)
program.addOption(
  new Option('--throttle <SIZE>', 'Number of simultaneous requests allowed against the API')
    .argParser(parseInteger)
    .default(5)
)
program.addOption(
  new Option('--type <TYPE>', 'Type of input text')
    .choices(['text', 'ssml'])
    .default('text')
)
program.addOption(
  new Option('--voice <VOICE>', 'Voice to use for the speech (default "Joanna" for AWS)')
)

module.exports = { program }
