import React, { useImperativeHandle, useState } from 'react'
import { Mode, ReadResult } from './template'
import { ReadableBitStream, WritableBitStream } from '../bit-stream'
import { calculatePSNR } from '../util'
import { fromByteArray, toByteArray } from 'base64-js';

const deriveKeyFromPassword = async (password: string, salt: Uint8Array) => {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-CBC',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  )

  return derivedKey
}

const encryptSymmetric = async (encodedPlaintext: Uint8Array, password: string): Promise<Uint8Array> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(16));

  const secretKey = await deriveKeyFromPassword(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-CBC',
      iv,
    },
    secretKey,
    encodedPlaintext
  );

  const combinedMessage = new Uint8Array(iv.length + salt.length + ciphertext.byteLength);
  combinedMessage.set(iv, 0); // First 16 bytes is IV
  combinedMessage.set(salt, iv.length); // Next 16 bytes is salt
  combinedMessage.set(new Uint8Array(ciphertext), iv.length + salt.length); // Rest is cyphertext

  return combinedMessage;
};



const decryptSymmetric = async (combinedMessage: Uint8Array, password: string): Promise<Uint8Array> => {
  const iv = combinedMessage.slice(0, 16);
  const salt = combinedMessage.slice(16, 32);
  const ciphertext = combinedMessage.slice(32);

  const secretKey = await deriveKeyFromPassword(password, salt);

  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-CBC',
      iv,
    },
    secretKey,
    ciphertext
  );

  return new Uint8Array(plaintextBuffer);
}



export default {
  supportedInput: 'single-text',
  label: 'AES LSB',
  OptionsComponent: ({ isReadMode, executor, requestRefresh }) => {
    const [bitsPerChannelCount, setBitsPerChannelCount] = useState(1)
    const [password, setPassword] = useState('')

    useImperativeHandle(
      executor,
      () => ({
        calculateMaxStorageCapacityBits(imageWidth: number, imageHeight: number): number {
          return imageWidth * imageHeight * 3 * bitsPerChannelCount
        },
        async doWrite(image: ImageData, data: Uint8Array): Promise<void> {
          const combinedMessage = await encryptSymmetric(data, password)

          const maxCapacity = image.width * image.height * 3 * bitsPerChannelCount;
          const totalBitsNeeded = combinedMessage.length * 8;
          if (totalBitsNeeded > maxCapacity) {
            throw new Error('You want to encode too much data in this photo.')
          }

          const readStream = ReadableBitStream.createFromUint8Array(combinedMessage, false)
          const writeStream = WritableBitStream.createFromUint8Array(image.data, true)
          writeStream.putByte((combinedMessage.length >> 24) & 0xff)
          writeStream.putByte((combinedMessage.length >> 16) & 0xff)
          writeStream.putByte((combinedMessage.length >> 8) & 0xff)
          writeStream.putByte((combinedMessage.length >> 0) & 0xff)
          while (true) {
            if (readStream.isOver() || writeStream.isOver()) break

            writeStream.skipNextBits(8 - bitsPerChannelCount)
            for (let i = 0; i < bitsPerChannelCount; ++i) {
              writeStream.putBit(readStream.getNextBit())
            }
          }
        },
        async doRead(image: ImageData): Promise<ReadResult> {
          const readStream = ReadableBitStream.createFromUint8Array(image.data, true)
          const length =
            (readStream.getNextByte() << 24) |
            (readStream.getNextByte() << 16) |
            (readStream.getNextByte() << 8) |
            (readStream.getNextByte() << 0)
          if (length < 0 || length > 1_000_000) throw new Error('Attempt to create array of length ' + length + 'b')
          const messageBytes = new Uint8Array(length)
          const writeStream = WritableBitStream.createFromUint8Array(messageBytes, false)
          while (true) {
            if (writeStream.isOver()) break
            readStream.skipNextBits(8 - bitsPerChannelCount)
            for (let i = 0; i < bitsPerChannelCount; ++i) {
              const bit = readStream.getNextBit()
              writeStream.putBit(bit)
            }
          }
          const decryptedMessage = await decryptSymmetric(messageBytes, password)

          return new Uint8Array(decryptedMessage)
        },
        calculatePSNR(originalImage: ImageData, encodedImage: ImageData): number {
          return calculatePSNR(originalImage, encodedImage)
        },
      }),
      [bitsPerChannelCount, password],
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
        <label>
          Password to {isReadMode ? "Decrypt" : "Encrypt"} your data:
          <input
            type="text"
            onChange={e => {
              setPassword(e.target.value)
              requestRefresh()
            }}
          />
        </label>
      </section>
    )
  },
} satisfies Mode
