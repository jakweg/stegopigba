import React, { useImperativeHandle, useState } from 'react'
import { Mode, ReadResult } from './template'
import { ReadableBitStream, WritableBitStream } from '../bit-stream'
import { PixelSkipper } from '../pixel-skipper'
import { calculatePSNR } from '../util'

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
            if (data.length > 6) {
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

            const bitsToWrite = [2,2,4]
            let howManyBits = 0
            while (true) {
              const hasMoreData = readStreams.some(stream => !stream.isOver());
              if (!hasMoreData || writeStream.isOver()) break
              for (let i = 0; i < readStreams.length; i++) {
                const stream = readStreams[i];
                if (stream.isOver()) {
                  continue
                }
                writeStream.skipNextBits(8 - bitsToWrite[howManyBits])
                for (let j =0; j < bitsToWrite[howManyBits]; j++){
                  writeStream.putBit(stream.getNextBit())
                }
                howManyBits = (howManyBits + 1) % 3
              }
        }
          setIsLoading(false)
        },

        doRead(image: ImageData): ReadResult {
          setIsLoading(true)
          const readStream = ReadableBitStream.createFromUint8Array(image.data, true)

          const streamLengths: number[] = [];
          for (let i = 0; i < 6; i++) {
            const length =
            (readStream.getNextByte() << 24) |
            (readStream.getNextByte() << 16) |
            (readStream.getNextByte() << 8) |
            (readStream.getNextByte() << 0)
            if (length < 0 || length > 1_000_000) {
              throw new Error('Attempt to create array of length ' + length + 'b')
            }
            streamLengths.push(length);
          }
          const writableStreams = streamLengths.map(length =>
            WritableBitStream.createFromUint8Array(new Uint8Array(length), false)
          );
        
          const bitsToRead = [2, 2, 4];
          let howManyBits = 0;

          while (writableStreams.some(stream => !stream.isOver())) {
            for (let i = 0; i < writableStreams.length; i++) {
              const stream = writableStreams[i];
              if (stream.isOver()) {
                continue
              }
              readStream.skipNextBits(8 - bitsToRead[howManyBits])
              for (let j =0; j < bitsToRead[howManyBits]; j++){
                const bit = readStream.getNextBit()
                stream.putBit(bit)
              }
              howManyBits = (howManyBits + 1) % 3
            }
          }
          // const bytes = new Uint8Array(length)
          // const writeStream = WritableBitStream.createFromUint8Array(bytes, false)
          // while (true) {
          //   if (writeStream.isOver()) break

          //   readStream.skipNextBits(8 - 2)
          //   for (let i = 0; i < 2; ++i) {
          //     const bit = readStream.getNextBit()
          //     writeStream.putBit(bit)
          //   }
          //   readStream.skipNextBits(8 - 2)
          //   for (let i = 0; i < 2; ++i) {
          //     const bit = readStream.getNextBit()
          //     writeStream.putBit(bit)
          //   }
          //   readStream.skipNextBits(8 - 4)
          //   for (let i = 0; i < 4; ++i) {
          //     const bit = readStream.getNextBit()
          //     writeStream.putBit(bit)
          //   }
          // }
          setIsLoading(false)
          return writableStreams.map(stream => stream.toUint8Array());
        },
        calculatePSNR(originalImage: ImageData, encodedImage: ImageData): number {
          return calculatePSNR(originalImage, encodedImage);
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
