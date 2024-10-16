import { sliceBytesIntoZeroSeparatedBits } from './bit-magic'
import { PixelSkipper } from './pixel-skipper'
import { ReadableBitStream, WritableBitStream } from './bit-stream'
import { debounce, loadImage, readFileDataUrl } from './util'

const dataSizeSpan = document.getElementById('data-size') as HTMLSpanElement
const imageCapacitySpan = document.getElementById('image-capacity') as HTMLSpanElement
const capacityPercentageSpan = document.getElementById('capacity-percentage') as HTMLSpanElement
const embedOnBitsSpan = document.getElementById('embed-on-bits') as HTMLSpanElement
const embedOnBitsInput = document.getElementById('embed-bits-count') as HTMLInputElement
const textDataInput = document.getElementById('text-to-embed') as HTMLInputElement
const textFromImageInput = document.getElementById('text-from-image') as HTMLInputElement

const imagePreviewCanvas = document.getElementById('image-preview') as HTMLCanvasElement
const imagePreviewContext = imagePreviewCanvas.getContext('2d', {
  alpha: true,
  willReadFrequently: true,
})

let selectedMode: string
let originalImage: HTMLImageElement
let useBitsPerChannel: number = 1

function refresh() {
  imagePreviewCanvas.width = 0
  imagePreviewCanvas.height = 0

  useBitsPerChannel = Math.max(1, Math.min(8, +embedOnBitsInput.value | 0))
  embedOnBitsSpan.textContent = `${useBitsPerChannel}`

  const currentDataAsString = textDataInput.value

  const encoder = new TextEncoder()
  const currentDataAsBytes = encoder.encode(currentDataAsString)
  dataSizeSpan.textContent = `${currentDataAsBytes.length * 8}`

  if (originalImage) {
    const maxCapacity = originalImage.width * originalImage.height * 3 * useBitsPerChannel
    imageCapacitySpan.textContent = `${maxCapacity}`

    capacityPercentageSpan.textContent = `${(((currentDataAsBytes.length * 8) / maxCapacity) * 100).toFixed(2)}`

    if (selectedMode === 'write-text') {
      imagePreviewCanvas.width = originalImage.width
      imagePreviewCanvas.height = originalImage.height
      imagePreviewContext.drawImage(originalImage, 0, 0)
      const imageData = imagePreviewContext.getImageData(0, 0, imagePreviewCanvas.width, imagePreviewCanvas.height, {
        colorSpace: 'srgb',
      })
      const readStream = ReadableBitStream.createFromUint8Array(currentDataAsBytes, false)
      const writeStream = WritableBitStream.createFromUint8Array(imageData.data, true)
      writeStream.putByte((currentDataAsBytes.length >> 24) & 0xff)
      writeStream.putByte((currentDataAsBytes.length >> 16) & 0xff)
      writeStream.putByte((currentDataAsBytes.length >> 8) & 0xff)
      writeStream.putByte((currentDataAsBytes.length >> 0) & 0xff)

      const randomSeed = ((Math.random() * 255) | 0) & 0xff
      writeStream.putByte(randomSeed)
      const skipper = new PixelSkipper(
        randomSeed,
        (currentDataAsBytes.length * 8) / useBitsPerChannel,
        maxCapacity / useBitsPerChannel,
      )

      while (true) {
        if (readStream.isOver() || writeStream.isOver()) break

        writeStream.skipNextBits(8 - useBitsPerChannel)
        if (skipper.getNextShouldSkip()) {
          writeStream.skipNextBits(useBitsPerChannel)
        } else {
          for (let i = 0; i < useBitsPerChannel; ++i) {
            writeStream.putBit(readStream.getNextBit())
          }
        }
      }

      imagePreviewContext.putImageData(imageData, 0, 0)
    } else if (selectedMode === 'read-text') {
      imagePreviewCanvas.width = originalImage.width
      imagePreviewCanvas.height = originalImage.height
      imagePreviewContext.drawImage(originalImage, 0, 0)
      const imageData = imagePreviewContext.getImageData(0, 0, imagePreviewCanvas.width, imagePreviewCanvas.height, {
        colorSpace: 'srgb',
      })
      const readStream = ReadableBitStream.createFromUint8Array(imageData.data, true)
      const length =
        (readStream.getNextByte() << 24) |
        (readStream.getNextByte() << 16) |
        (readStream.getNextByte() << 8) |
        (readStream.getNextByte() << 0)

      const skipper = new PixelSkipper(
        readStream.getNextByte(),
        (length * 8) / useBitsPerChannel,
        imageData.width * imageData.height * 3,
      )

      if (length < 0 || length > 1_000_000) throw new Error('Attempt to create array of length ' + length + 'b')
      const bytes = new Uint8Array(length)
      const writeStream = WritableBitStream.createFromUint8Array(bytes, false)
      while (true) {
        if (writeStream.isOver()) break
        readStream.skipNextBits(8 - useBitsPerChannel)
        if (skipper.getNextShouldSkip()) {
          readStream.skipNextBits(useBitsPerChannel)
        } else {
          for (let i = 0; i < useBitsPerChannel; ++i) {
            const bit = readStream.getNextBit()
            writeStream.putBit(bit)
          }
        }
      }

      const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
      try {
        const decodedAsText = decoder.decode(bytes)
        textFromImageInput.value = decodedAsText
        textFromImageInput.style.color = ''
      } catch (_) {
        textFromImageInput.value = 'Unable to decode'
        textFromImageInput.style.color = 'red'
      }
    }
  }
}

;(document.getElementById('embed-in-file') as HTMLInputElement).addEventListener('change', async event => {
  const file = (event.target as HTMLInputElement).files[0]
  if (!file) return
  const dataUrl = await readFileDataUrl(file)
  const img = await loadImage(dataUrl)

  originalImage = img

  refresh()
})

embedOnBitsInput.addEventListener('change', refresh)
embedOnBitsInput.addEventListener('input', refresh)
textDataInput.addEventListener('change', refresh)
// commented cos causes lag
// textDataInput.addEventListener('input', debounce(refresh, 300))

for (const btn of document.getElementsByClassName('download-png-btn')) {
  ;(btn as HTMLInputElement).addEventListener('click', () => {
    const dataUrl = imagePreviewCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = 'with-embeded.png'
    link.href = dataUrl
    link.click()
  })
}

for (const input of document.getElementsByName('mode')) {
  ;(input as HTMLInputElement).addEventListener('change', () => {
    selectedMode = (input as HTMLInputElement).value

    document.querySelectorAll(`[id*=operation]`).forEach(e => ((e as HTMLElement).style.display = 'none'))
    document.getElementById(`operation-${selectedMode}`).style.display = ''
    refresh()
  })
}

refresh()
