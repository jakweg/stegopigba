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

export function calculateMSE(originalImage: ImageData, encodedImage: ImageData): number {
  const originalPixels = originalImage.data;
  const encodedPixels = encodedImage.data;

  let mse = 0;
  const totalPixels = originalImage.width * originalImage.height;

  for (let i = 0; i < totalPixels * 4; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      const diff = originalPixels[i + channel] - encodedPixels[i + channel];
      mse += diff ** 2;
    }
  }

  mse /= totalPixels * 3;
  return mse;
}

export function calculatePSNR(originalImage: ImageData, encodedImage: ImageData): number {
  const MAX_I = 255;
  const mse = calculateMSE(originalImage, encodedImage);

  if (mse === 0) return Infinity;
  return 20 * Math.log10(MAX_I / Math.sqrt(mse));
}
