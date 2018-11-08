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
  INPUTFILE                The text file to convert (reads from stdin if not specified)
  OUTPUTFILE               The filename to save the audio to
Options:
  --help                   Displays this info and exits
  --access-key KEY         AWS access key ID
  --effects ID             Apply an audio effect profile. Can be specified multiple times.
  --email EMAIL            GCP client email address (required if "private-key" or
                             "private-key-file" is used)
  --ffmpeg BINARY          Path to the ffmpeg binary (defaults to the one in PATH)
  --format FORMAT          Target audio format ("mp3", "ogg", or "pcm") (default "mp3")
  --gain GAIN              Volume gain, where 0.0 is normal gain
  --gender GENDER          Gender of the voice ("male", "female", or "neutral")
  --language LANG          Code for the desired language (default "en-US" for GCP,
                             no default for AWS)
  --lexicon NAME           Apply a stored pronunciation lexicon. Can be specified
                             multiple times.
  --pitch PITCH            Change in speaking pich, in semitones
  --private-key KEY        GCP private key
  --private-key-file FILE  GCP private key file (".pem" or ".p12" file)
  --project-file FILE      GCP ".json" file with project info
  --project-id ID          GCP project ID
  --region REGION          AWS region to send requests to (default "us-east-1")
  --sample-rate RATE       Audio frequency, in hertz.
  --secret-key KEY         AWS secret access key
  --service TYPE           Cloud service to use ("aws" or "gcp") (default "aws")
  --speed RATE             Speaking rate, where 1.0 is normal speed
  --throttle SIZE          Number of simultaneous requests allowed against the AWS API
                             (default 5)
  --type TYPE              Type of input text ("text" or "ssml") (default "text")
  --voice VOICE            Voice to use for the speech (default "Joanna" for AWS)
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
