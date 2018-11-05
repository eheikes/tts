const path = require('path')

/**
 * Checks if the CLI was called with valid arguments.
 */
exports.checkUsage = (args, proc) => {
  const minNumArgs = 1
  const script = path.basename(proc.argv[1])
  const usageStatement = `Converts a text file to speech using AWS Polly or Google Cloud Text-to-Speech.
Usage:
  ${script} [INPUTFILE] OUTPUTFILE [OPTIONS]
Standard:
  INPUTFILE           The text file to convert (reads from stdin if not specified)
  OUTPUTFILE          The filename to save the audio to
Options:
  --help              Displays this info and exits
  --access-key KEY    AWS access key ID
  --ffmpeg BINARY     Path to the ffmpeg binary (defaults to the one in PATH)
  --format FORMAT     Target audio format ("mp3", "ogg", or "pcm") (default "mp3")
  --lexicon NAME      Apply a stored pronunciation lexicon. Can be specified multiple times.
  --region REGION     AWS region to send requests to (default "us-east-1")
  --sample-rate RATE  Audio frequency, in hertz.
  --secret-key KEY    AWS secret access key
  --service TYPE      Cloud service to use ("aws" or "gcp") (default "aws")
  --throttle SIZE     Number of simultaneous requests allowed against the AWS API (default 5)
  --type TYPE         Type of input text ("text" or "ssml") (default "text")
  --voice VOICE       Voice to use for the speech (default "Joanna" for AWS,
                      "en-US-Standard-C" for GCP)
`
  if (args.help) {
    proc.stderr.write(usageStatement)
    proc.exit(0)
  }
  if (args._.length < minNumArgs) {
    proc.stderr.write(usageStatement)
    proc.exit(1)
  }
}
