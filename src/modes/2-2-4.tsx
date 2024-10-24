import React, { useImperativeHandle, useState } from 'react'
import { Mode, ReadResult } from './template'
import { ReadableBitStream, WritableBitStream } from '../bit-stream'
import { PixelSkipper } from '../pixel-skipper'

export default {
  label: '2-2-4 LSB',
  OptionsComponent: ({ isReadMode, executor, requestRefresh }) => {
    const [isLoading, setIsLoading] = useState(false);
    useImperativeHandle(
      executor,
      () => ({
        calculateMaxStorageCapacityBits(imageWidth: number, imageHeight: number): number {
          return imageWidth * imageHeight * (2 + 2 + 4)
        },
        doWrite(image: ImageData, data: Array<Uint8Array>): void {
            if (data.length >= 6) {
                throw new Error('You want to encode too much texts in this photo. (maximum number is 6');
            }


            setIsLoading(true);
            const maxCapacity = image.width * image.height * (2 + 2 + 4)
            const totalBitsNeeded = data.reduce((sum, currentData) => sum + (currentData.length * 8), 0)
            if (totalBitsNeeded > maxCapacity) {
                throw new Error('You want to encode too much data in this photo.');
            }
            const readStreams = data.map(d => ReadableBitStream.createFromUint8Array(d, false))
            const writeStream = WritableBitStream.createFromUint8Array(image.data, true)

            data.forEach(d => {
                writeStream.putByte((d.length >> 24) & 0xff);
                writeStream.putByte((d.length >> 16) & 0xff);
                writeStream.putByte((d.length >> 8) & 0xff);
                writeStream.putByte((d.length >> 0) & 0xff);
              });
            // need to decide how it should be divided into writeStream (RGB (8 bits from message) or every color should have differnt something from given message)

            while (true) {
            if (readStream.isOver() || writeStream.isOver()) break
            
            writeStream.skipNextBits(8 - 2)
            for (let i = 0; i < 2; ++i){
                writeStream.putBit(readStream.getNextBit())
            }
            writeStream.skipNextBits(8 - 2)
            for (let i = 0; i < 2; ++i){
                writeStream.putBit(readStream.getNextBit())
            }
            writeStream.skipNextBits(8 - 4)
            for (let i = 0; i < 4; ++i){
                writeStream.putBit(readStream.getNextBit())
            }
        }
          setIsLoading(false)
        },

        doRead(image: ImageData): ReadResult {
          setIsLoading(true)
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

            readStream.skipNextBits(8 - 2)
            for (let i = 0; i < 2; ++i) {
              const bit = readStream.getNextBit()
              writeStream.putBit(bit)
            }
            readStream.skipNextBits(8 - 2)
            for (let i = 0; i < 2; ++i) {
              const bit = readStream.getNextBit()
              writeStream.putBit(bit)
            }
            readStream.skipNextBits(8 - 4)
            for (let i = 0; i < 4; ++i) {
              const bit = readStream.getNextBit()
              writeStream.putBit(bit)
            }
          }
          setIsLoading(false)
          return bytes
        },
      }),
    )

    return (
      <section>
        {isLoading ? (<label>Loading...</label>
        ) : (
        <label>
          {isReadMode ? 'Decoding 2-2-4 method': 'Encoding 2-2-4 method'}
        </label>
        )}
      </section>
    )
  },
} satisfies Mode
