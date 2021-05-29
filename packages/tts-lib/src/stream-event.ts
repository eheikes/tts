export enum StreamEvent {
  Error = 'error',
  Split = 'split', // text has been split
  Data = 'data', // chunk of data -- when audio has been processed
  End = 'end', // all audio files have been generated -- has temp filenames
  Save = 'save', // after final file has been created
  Finish = 'close' // all done
}
