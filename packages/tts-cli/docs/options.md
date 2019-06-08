# Options Reference

Options have a 2-hyphen prefix, e.g. `--format`. The value follows, either separated by a space or an equal sign -- `--format mp3` and `--format=mp3` are equally valid.

## `--access-key` / `--secret-key`

**Supported: AWS**

The access key and secret key are the credentials that AWS uses to identify your account. If you do not want to put your credentials in a [configuration file](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html), or if you want to use credentials different than what are in your configuration file, you will need to specify them when you run tts-cli.

```
$ tts test.txt test.mp3 --access-key ABCDEFG --secret-key hwl500CZygitV91n
```

## `--effect`

**Supported: GCP**

Adds an audio effect (also called an audio profile or a device profile) to the speech after synthesis. Can be specified multiple times -- effects are applied on top of each other in the order given.

```
$ tts test.txt test.mp3 --service gcp --effect handset-class-device
```

See the [GCP documentation](https://cloud.google.com/text-to-speech/docs/audio-profiles) for the available effects.

## `--email`

**Supported: GCP**

Specifies the email address used to identify the account. This is the same as the `client_email` for your GCP project.

```
$ tts test.txt test.mp3 --service gcp --email starting-account-kjd6bvn58@alert-vista-12345.iam.gserviceaccount.com --private-key-file .\key.pem
```

## `--ffmpeg`

**Supported: AWS, GCP**

Specifies the location of the `ffmpeg` program on your machine. Ideally, the program would automatically be located (usually through the `PATH` environment variable), but you can specify it manually.

```
$ tts test.txt test.mp3 --ffmpeg C:\ffmpeg\ffmpeg.exe
```

## `--format`

**Supported: AWS, GCP**

Specifies the audio format you want for the output file. Possible values:

* `mp3` (default)
* `ogg` -- [Vorbis](https://en.wikipedia.org/wiki/Vorbis) (AWS) or [Opus](https://en.wikipedia.org/wiki/Opus_(audio_format)) (GCP) audio wrapped inside an Ogg container.
* `ogg_vorbis` -- Deprecated, use `ogg` instead.
* `pcm` -- Audio in a linear PCM sequence  (signed 16-bit, 1 channel mono, little-endian format). Audio frequency depends on the `--sample-rate` option. AWS returns raw audio; GCP includes a WAV file header.

```
$ tts test.txt test.ogg --format ogg
```

## `--gain`

**Supported: GCP**

Volume gain (in dB), from -96.0 to 16.0. A value of 0.0 will play at normal native signal amplitude. A value of -6.0 will play at approximately half the amplitude. A value of +6.0 will play at approximately twice the amplitude.

```
$ tts test.txt test.mp3 --service gcp --gain 6
```

Note that negative gains must be specified using the equal-sign syntax, otherwise the value is interpreted as an option name:

```
$ tts test.txt test.mp3 --service gcp --gain=-12
```

## `--gender`

**Supported: GCP**

Gender of the voice. Leave it unspecified if you don't care what gender the selected voice will have.

* `male` for a male voice
* `female` for a female voice
* `neutral` for a gender-neutral voice

```
$ tts test.txt test.mp3 --service gcp --gender female
```

## `--language`

**Supported: GCP**

Language for the voice, expressed as a [BCP-47](https://www.rfc-editor.org/rfc/bcp/bcp47.txt) language tag (e.g. `en-US`, `es-419`, `cmn-tw`). This should not include a script tag (e.g. use `cmn-cn` rather than `cmn-Hant-cn`).

Defaults to `en-US` if not specified.

> Note that the TTS service may choose a voice with a slightly different language code than the one selected; it may substitute a different region (e.g. using `en-US` rather than `en-CA` if there isn't a Canadian voice available), or even a different language, e.g. using `nb` (Norwegian Bokmal) instead of `no` (Norwegian).

```
$ tts test.txt test.mp3 --service gcp --language zh-CN
```

## `--lexicon`

**Supported: AWS**

Applies a stored pronunciation lexicon. (See the AWS Polly documentation on [managing lexicons](https://docs.aws.amazon.com/polly/latest/dg/managing-lexicons.html).) Lexicons are applied only if the language of the lexicon is the same as the language of the voice.

Can be specified multiple times.

```
$ tts test.txt test.ogg --lexicon lexicon1 --lexicon lexicon2
```

## `--pitch`

**Supported: GCP**

Changes the speaking pitch (in semitones), from -20.0 to 20.0.

```
$ tts test.txt test.mp3 --service gcp --pitch 10
```

Note that negative pitch must be specified using the equal-sign syntax, otherwise the value is interpreted as an option name:

```
$ tts test.txt test.mp3 --service gcp --pitch=-10
```

## `--private-key` / `--private-key-file`

**Supported: GCP**

Specifies the private key (`--private-key`), or the file containing the private key (`--private-key-file`), used to make secure requests to Google Cloud. It should be either in [PEM format](http://how2ssl.com/articles/working_with_pem_files/) (beginning with "-----BEGIN PRIVATE KEY-----" and ending with "-----END PRIVATE KEY-----") or in [PKCS #12](https://en.wikipedia.org/wiki/PKCS_12) format.

You must also specify `--email` if you use either option.

For security and ease of use, `--private-key-file` is recommended over `--private-key`.

```
$ tts test.txt test.mp3 --service gcp --email foo@example.com --private-key-file .\key.pem
```

```
$ tts test.txt test.mp3 --service gcp --email foo@example.com --private-key "-----BEGIN PRIVATE KEY-----\nMIIEvQIBA......DAAMY=\n-----END PRIVATE KEY-----\n"
```

## `--project-file`

**Supported: GCP**

Specifies the `.json` file with your project configuration.

When setting up a Google Cloud project, you should be able to download a project file that looks something like this:

```json
{
  "type": "service_account",
  "project_id": "alert-vista-895093",
  "private_key_id": "ad386093c2ab",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBAD....AAMY=\n-----END PRIVATE KEY-----\n",
  "client_email": "my-account-gj38dl@alert-vista-895093.iam.gserviceaccount.com",
  "client_id": "6873947275063",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/my-account-gj38dl%40alert-vista-895093.iam.gserviceaccount.com"
}
```

If you save this file to your computer, you can then invoke tts-cli and use the `--project-file` option to point to that file.

```
$ tts test.txt test.mp3 --service gcp ---project-file .\my-project.json
```

## `--project-id`

**Supported: GCP**

Specifies the ID used to identify your project.

Usually you'll want to use `--project-file`, or `--email` + `--private-key-file`, to identify your project instead.

```
$ tts test.txt test.mp3 --service gcp --email foo@example.com ---project-id grape-spaceship-123
```

## `--region`

**Supported: AWS**

Specifies the [AWS region](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html) to send requests to. Using a region closer to your location may result in faster processing, but note that regions may vary in cost.

```
$ tts test.txt test.mp3 --region us-west-2
```

## `--sample-rate`

**Supported: AWS, GCP**

Specifies the audio frequency (in Hz).

* Valid values for `mp3` and `ogg` formats are `8000`, `11025` (GCP only), `16000`, `22050` (default), `32000` (GCP only), `44100` (GCP only), and `48000` (GCP only).
* Valid values for `pcm` are `8000`, `11025` (GCP only), `16000` (default), and `22050` (GCP only).

```
$ tts test.txt test.mp3 --sample-rate 8000
```

## `--service`

**Supported: AWS, GCP**

Specifies which service to use:

* `aws` to use AWS Polly (default)
* `gcp` to use Google Cloud Text-to-Speech

```
$ tts test.txt test.mp3 --service gcp
```

## `--speed`

**Supported: GCP**

Specifies the speaking rate, from 0.25 to 4.0, where 1.0 is normal speed. Using 2.0 will result in speech that is twice as fast, while 0.5 will result in speech that is half as fast as normal.

```
$ tts test.txt test.mp3 --service gcp --speed 2
```

## `--throttle`

**Supported: AWS, GCP**

Indicates how many simultaneous requests to make against the service. A higher number will send requests faster to AWS or GCP, but will use of more of your bandwidth, and the service may reject your requests if you send too many at a time.

```
$ tts test.txt test.mp3 --throttle 2
```

## `--type`

**Supported: AWS, GCP**

Specifies the type of input text.

* `text` indicates plain text (default).
* `ssml` indicates an [SSML](https://www.w3.org/TR/speech-synthesis/)-formatted document. The document must be valid, well-formed SSML. Support and extensions to SSML elements vary by service; check the [AWS docs](https://docs.aws.amazon.com/polly/latest/dg/supported-ssml.html) and [GCP docs](https://cloud.google.com/text-to-speech/docs/ssml) for details.

```
$ tts test.ssml test.mp3 --type ssml
```

## `--voice`

**Supported: AWS, GCP**

Indicates the voice to use for speech.

AWS has a [collection of voices](https://docs.aws.amazon.com/polly/latest/dg/voicelist.html) available. The default is `Joanna`.

```
$ tts test.ssml test.mp3 --service aws --voice Geraint
```

GCP will choose a voice based on the `--language` and `--gender` values (either specified by you or from the defaults); there is no default voice. You can still specify a voice name using this option -- see the list of [supported voices](https://cloud.google.com/text-to-speech/docs/voices).

```
$ tts test.ssml test.mp3 --service gcp --voice en-US-Standard-E
```
