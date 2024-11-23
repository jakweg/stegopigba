import React, { useImperativeHandle, useState } from 'react'
import { Mode, ReadResult } from './template'
import { ReadableBitStream, WritableBitStream } from '../bit-stream'
import { calculatePSNR } from '../util/generic'
import {
  caesarDecryptWithCustomAlphabet,
  caesarEncryptWithCustomAlphabet,
  createShiftedAlphabet,
  decryptRailFence,
  encryptRailFence,
} from '../util/encryption-layered'

export default {
  supportedInput: 'single-text',
  label: 'Layered Encryption LSB',
  OptionsComponent: ({ isReadMode, executor, requestRefresh }) => {
    useImperativeHandle(
      executor,
      () => ({
        calculateMaxStorageCapacityBits(imageWidth: number, imageHeight: number): number {
          return imageWidth * imageHeight * 3 * 2
        },
        doWrite(image: ImageData, data: Uint8Array) {
          const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
          const encoder = new TextEncoder()

          const plaintextMessage = decoder.decode(data)
          const alphabet = createShiftedAlphabet()
          const shift = 3
          const encryptedByCaesar = caesarEncryptWithCustomAlphabet(plaintextMessage, shift, alphabet)
          const encryptedByRailFence = encryptRailFence(encryptedByCaesar, 3)
          const message = `${alphabet}:${encryptedByRailFence}`
          const messageB64Encoded = btoa(message)
          const currentDataAsBytes = encoder.encode(messageB64Encoded)

          const maxCapacity = image.width * image.height * 3 * 2
          const totalBitsNeeded = currentDataAsBytes.length * 8
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
            writeStream.skipNextBits(8 - 2)
            for (let i = 0; i < 2; ++i) {
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
          if (length < 0 || length > 1_000_000) {
            throw new Error(`Invalid data length: ${length}`)
          }

          const messageBytes = new Uint8Array(length)
          const writeStream = WritableBitStream.createFromUint8Array(messageBytes, false)
          while (true) {
            if (writeStream.isOver()) break
            readStream.skipNextBits(8 - 2)
            for (let i = 0; i < 2; ++i) {
              const bit = readStream.getNextBit()
              writeStream.putBit(bit)
            }
          }
          const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
          const base64Message = decoder.decode(messageBytes)

          const plaintextMessage = atob(base64Message)
          const [alphabet, encryptedMessage] = plaintextMessage.split(':')

          const decryptedByRailFence = decryptRailFence(encryptedMessage, 3)
          const shift = 3
          const decryptedByCaesar = caesarDecryptWithCustomAlphabet(decryptedByRailFence, shift, alphabet)

          const encoder = new TextEncoder()
          return encoder.encode(decryptedByCaesar)
        },
        calculatePSNR(originalImage: ImageData, encodedImage: ImageData): number {
          return calculatePSNR(originalImage, encodedImage)
        },
      }),
      [],
    )

    return (
      <section>
        <label>Use bits: 2</label>
      </section>
    )
  },
} satisfies Mode