import React, { isValidElement, useImperativeHandle, useState } from 'react'
import { Mode, ReadResult } from './template'
import { ReadableBitStream, WritableBitStream } from '../bit-stream'
import { PixelSkipper } from '../util/pixel-skipper'
import { calculatePSNR, putNumberInFrontOfArray } from '../util/generic'
import { hsvToRgb, rgbToHsv } from '../util/color-conversion'

const readMatrix = [0, 1, 1, 1, 1, 1, 0, 0] as const
export default {
  label: 'HSV, Hue&Saturation',
  supportedInput: 'single-text',
  OptionsComponent: ({ isReadMode, executor, requestRefresh }) => {
    useImperativeHandle(
      executor,
      () => ({
        calculateMaxStorageCapacityBits(imageWidth: number, imageHeight: number, data: Uint8ClampedArray): number {
          return imageWidth * imageHeight * 2
        },

        doWrite(image: ImageData, data: Uint8Array): void {
          const readStream = ReadableBitStream.createFromUint8Array(putNumberInFrontOfArray(data, data.length), false)

          const bitByValue = new Array(8).fill(undefined).map(() => [0, 0])
          let skippedCounter = 0
          let randomizationAttempt = 0
          const MAX_RANDOMIZATION_ATTEMPTS = 100
          let previousBits: any = undefined
          for (let i = 0; i < image.width * image.height; ++i) {
            const r = image.data[i * 4 + 0]!
            const g = image.data[i * 4 + 1]!
            const b = image.data[i * 4 + 2]!

            let [h, s, v] = rgbToHsv(r, g, b)

            h = (h * 255) | 0
            s = (s * 255) | 0
            v = (v * 255) | 0

            h &= 0b1111_1000
            s &= 0b1111_1000
            let wasOneH: number, wasOneS: number
            if (previousBits) {
              wasOneH = previousBits[0]!
              wasOneS = previousBits[1]!
              previousBits = undefined
            } else {
              wasOneH = readStream.getNextBit()
              wasOneS = readStream.getNextBit()
            }
            h |= (wasOneH << 0) | (wasOneH << 1) // | (wasOneH << 2)
            s |= (wasOneS << 0) | (wasOneS << 1) // | (wasOneS << 2)

            h /= 255
            s /= 255
            v /= 255

            const [newR, newG, newB] = hsvToRgb(h, s, v).map(e => e | 0) as [number, number, number]

            image.data[i * 4 + 0] = newR
            image.data[i * 4 + 1] = newG
            image.data[i * 4 + 2] = newB
            ;[h, s, v] = rgbToHsv(newR, newG, newB)
            h = (h * 255) | 0
            s = (s * 255) | 0
            v = (v * 255) | 0

            h &= 0b0000_0111
            s &= 0b0000_0111

            const gotH = readMatrix[h]!
            const gotS = readMatrix[s]!

            if (gotH !== wasOneH || gotS !== wasOneS) {
              randomizationAttempt++
              image.data[i * 4 + 0] =
                r + (((((Math.random() - 0.5) * randomizationAttempt * 2) / MAX_RANDOMIZATION_ATTEMPTS) * 127) | 0)
              image.data[i * 4 + 1] =
                g + (((((Math.random() - 0.5) * randomizationAttempt * 2) / MAX_RANDOMIZATION_ATTEMPTS) * 127) | 0)
              image.data[i * 4 + 2] =
                b + (((((Math.random() - 0.5) * randomizationAttempt * 2) / MAX_RANDOMIZATION_ATTEMPTS) * 127) | 0)
              --i
              previousBits = [wasOneH, wasOneS]
              if (randomizationAttempt === MAX_RANDOMIZATION_ATTEMPTS) {
                console.log('ERROR', { r: image.data[i * 4 + 0], g: image.data[i * 4 + 1], b: image.data[i * 4 + 2] })
                throw new Error('FAILED TO WRITE, repeatTimeout')
              }
            } else {
              bitByValue[h]![wasOneH]!++
              bitByValue[s]![wasOneS]!++
              randomizationAttempt = 0
            }
          }
          console.log({ skippedCounter, length: data.length, data })
          console.table(bitByValue)
        },

        doRead(image: ImageData): ReadResult {
          const tmpArray = new Uint8Array(1000000)
          const writeStream = WritableBitStream.createFromUint8Array(tmpArray, false)

          const objects: any[] = []
          let skippedCounter = 0
          for (let i = 0; i < image.width * image.height; ++i) {
            const r = image.data[i * 4 + 0]!
            const g = image.data[i * 4 + 1]!
            const b = image.data[i * 4 + 2]!

            let [h, s, v] = rgbToHsv(r, g, b)

            h = (h * 255) | 0
            s = (s * 255) | 0
            v = (v * 255) | 0

            h &= 0b0000_0111
            s &= 0b0000_0111

            writeStream.putBit(readMatrix[h]!)
            writeStream.putBit(readMatrix[s]!)
          }

          const length = (tmpArray[0]! << 24) | (tmpArray[1]! << 16) | (tmpArray[2]! << 8) | (tmpArray[3]! << 0)
          console.log('read length', {
            length,
            objects: objects.slice(0, 10000),
            tmpArray,
            skippedCounter,
            data: tmpArray.slice(4),
          })
          return tmpArray.slice(4)
        },
        calculatePSNR(originalImage: ImageData, encodedImage: ImageData): number {
          return calculatePSNR(originalImage, encodedImage)
        },
      }),
      [],
    )

    return <></>
  },
} satisfies Mode
