import React, { useImperativeHandle, useState } from 'react'
import { Mode, ReadResult } from './template'
import { ReadableBitStream, WritableBitStream } from '../bit-stream'
import { PixelSkipper } from '../pixel-skipper'
import { calculatePSNR } from '../util'

function encryptAES(message, key) {
  const array = new Uint32Array(16)
  self.crypto.getRandomValues(array)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

  let encrypted = cipher.update(message, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  return {
    iv: iv.toString('base64'),
    encryptedMessage: encrypted,
  }
}

// Funkcja do deszyfrowania wiadomości
function decryptAES(encryptedMessage, key, iv) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'base64'))

  let decrypted = decipher.update(encryptedMessage, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export default {
  label: 'AES LSB',
  OptionsComponent: ({ isReadMode, executor, requestRefresh }) => {
    const [bitsPerChannelCount, setBitsPerChannelCount] = useState(1)

    useImperativeHandle(
      executor,
      () => ({
        calculateMaxStorageCapacityBits(imageWidth: number, imageHeight: number): number {
          return imageWidth * imageHeight * 3 * bitsPerChannelCount
        },
        doWrite(image: ImageData, data: Uint8Array): void {
          // const key = crypto.randomBytes(32); // Generowanie klucza AES (256-bitowy)
          const password = 'my-secret-password'
          const key = crypto.createHash('sha256').update(password).digest()
          const plainText = 'Secret message for LSB'
          const { iv, encryptedMessage } = encryptAES(plainText, key)
          const combinedMessage = `${iv}:${encryptedMessage}`
          const encoder = new TextEncoder()
          const currentDataAsBytes = encoder.encode(combinedMessage)

          const maxCapacity = image.width * image.height * (2 + 2 + 4)
          const totalBitsNeeded = data.reduce((sum, currentData) => sum + currentDataAsBytes.length * 8, 0)
          if (totalBitsNeeded > maxCapacity) {
            throw new Error('You want to encode too much data in this photo.')
          }

          const readStream = ReadableBitStream.createFromUint8Array(currentDataAsBytes, false)
          const writeStream = WritableBitStream.createFromUint8Array(image.data, true)
          writeStream.putByte((currentDataAsBytes.length >> 24) & 0xff)
          writeStream.putByte((currentDataAsBytes.length >> 16) & 0xff)
          writeStream.putByte((currentDataAsBytes.length >> 8) & 0xff)
          writeStream.putByte((currentDataAsBytes.length >> 0) & 0xff)
          while (true) {
            if (readStream.isOver() || writeStream.isOver()) break

            writeStream.skipNextBits(8 - bitsPerChannelCount)
            for (let i = 0; i < bitsPerChannelCount; ++i) {
              writeStream.putBit(readStream.getNextBit())
            }
          }
        },
        doRead(image: ImageData): ReadResult {
          const readStream = ReadableBitStream.createFromUint8Array(image.data, true)
          const length =
            (readStream.getNextByte() << 24) |
            (readStream.getNextByte() << 16) |
            (readStream.getNextByte() << 8) |
            (readStream.getNextByte() << 0)
          if (length < 0 || length > 1_000_000) throw new Error('Attempt to create array of length ' + length + 'b')
          const bytes = new Uint8Array(length)
          const writeStream = WritableBitStream.createFromUint8Array(bytes, false)
          while (true) {
            if (writeStream.isOver()) break
            readStream.skipNextBits(8 - bitsPerChannelCount)
            for (let i = 0; i < bitsPerChannelCount; ++i) {
              const bit = readStream.getNextBit()
              writeStream.putBit(bit)
            }
          }

          const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
          const decodedText = decoder.decode(bytes)
          const [iv, encryptedMessage] = decodedText.split(':')
          console.log('Extracted IV (Base64):', iv)
          console.log('Extracted Encrypted Message (Base64):', encryptedMessage)
          const password = 'my-secret-password'
          const key = crypto.createHash('sha256').update(password).digest()
          const decryptedMessage = decryptAES(encryptedMessage, key, iv)
          console.log('Decrypted message: ', decryptedMessage)

          return new Uint8Array(length)
        },
        calculatePSNR(originalImage: ImageData, encodedImage: ImageData): number {
          return calculatePSNR(originalImage, encodedImage)
        },
      }),
      [bitsPerChannelCount],
    )

    return (
      <section>
        <label>
          Use bits:
          <input
            type="range"
            min={1}
            max={8}
            value={bitsPerChannelCount}
            onChange={e => {
              setBitsPerChannelCount(+(e.target as any).value || 1)
              requestRefresh()
            }}
          />
          {bitsPerChannelCount}
        </label>
      </section>
    )
  },
} satisfies Mode
