import React, { useImperativeHandle, useState } from 'react'
import { Mode, ReadResult } from './template'
import { ReadableBitStream, WritableBitStream } from '../bit-stream'
import { PixelSkipper } from '../util/pixel-skipper'
import { calculatePSNR } from '../util/generic'

export default {
  label: 'Basic LSB',
  supportedInput: 'single-text',
  OptionsComponent: ({ isReadMode, executor, requestRefresh }) => {
    const [bitsPerChannelCount, setBitsPerChannelCount] = useState(1)

    useImperativeHandle(
      executor,
      () => ({
        calculateMaxStorageCapacityBits(imageWidth: number, imageHeight: number): number {
          return imageWidth * imageHeight * 3 * bitsPerChannelCount
        },

        doWrite(image: ImageData, data: Uint8Array): void {
          const maxCapacity = image.width * image.height * 3 * bitsPerChannelCount

          const readStream = ReadableBitStream.createFromUint8Array(data, false)
          const writeStream = WritableBitStream.createFromUint8Array(image.data, true)
          writeStream.putByte((data.length >> 24) & 0xff)
          writeStream.putByte((data.length >> 16) & 0xff)
          writeStream.putByte((data.length >> 8) & 0xff)
          writeStream.putByte((data.length >> 0) & 0xff)

          const randomSeed = ((Math.random() * 255) | 0) & 0xff
          writeStream.putByte(randomSeed)
          const skipper = new PixelSkipper(
            randomSeed,
            (data.length * 8) / bitsPerChannelCount,
            maxCapacity / bitsPerChannelCount,
          )

          while (true) {
            if (readStream.isOver() || writeStream.isOver()) break

            writeStream.skipNextBits(8 - bitsPerChannelCount)
            if (skipper.getNextShouldSkip()) {
              writeStream.skipNextBits(bitsPerChannelCount)
            } else {
              for (let i = 0; i < bitsPerChannelCount; ++i) {
                writeStream.putBit(readStream.getNextBit())
              }
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

          const skipper = new PixelSkipper(
            readStream.getNextByte(),
            (length * 8) / bitsPerChannelCount,
            image.width * image.height * 3,
          )

          if (length < 0) throw new Error('Attempt to create array of length ' + length + 'b')
          const bytes = new Uint8Array(length)
          const writeStream = WritableBitStream.createFromUint8Array(bytes, false)
          while (true) {
            if (writeStream.isOver()) break
            readStream.skipNextBits(8 - bitsPerChannelCount)
            if (skipper.getNextShouldSkip()) {
              readStream.skipNextBits(bitsPerChannelCount)
            } else {
              for (let i = 0; i < bitsPerChannelCount; ++i) {
                const bit = readStream.getNextBit()
                writeStream.putBit(bit)
              }
            }
          }

          return bytes
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
