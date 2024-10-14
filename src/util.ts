export function readFileAsArrayBuffer(file: File) {
  return new Promise(resolve => {
    const reader = new FileReader()

    reader.addEventListener(
      'load',
      () => {
        resolve(reader.result as ArrayBuffer)
      },
      false,
    )
    reader.readAsArrayBuffer(file)
  })
}

export function readFileDataUrl(file: File) {
  return new Promise<string>(resolve => {
    const reader = new FileReader()

    reader.addEventListener(
      'load',
      () => {
        resolve(reader.result as string)
      },
      false,
    )
    reader.readAsDataURL(file)
  })
}

export function loadImage(url: string) {
  return new Promise<HTMLImageElement>(resolve => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.src = url
  })
}

export function debounce(internal: () => void, ms: number) {
  let timeoutId
  return () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      internal()
    }, ms)
  }
}
