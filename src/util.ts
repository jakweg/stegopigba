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
  let timeoutId: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      internal()
    }, ms)
  }
}

export function downloadCanvasToPng(canvas: HTMLCanvasElement, name: string) {
  const dataUrl = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.download = name
  link.href = dataUrl
  link.click()
}
