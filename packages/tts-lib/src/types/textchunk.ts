declare module 'textchunk' {
  function chunk(
    text: string,
    length: number,
    opts?: {
      callback?: () => void
    }
  ): string[]
}
