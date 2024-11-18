import React, { useImperativeHandle, useState } from 'react'
import { Mode, ReadResult } from './template'
import { ReadableBitStream, WritableBitStream } from '../bit-stream'
import { PixelSkipper } from '../pixel-skipper'
import { calculatePSNR } from '../util'

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

export const encryptSymmetric = async (encodedPlaintext: Uint8Array, password: string) => {
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


  const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const saltBase64 = btoa(String.fromCharCode(...salt));

  return {
    ciphertext: ciphertextBase64,
    iv: ivBase64,
    salt: saltBase64,
  };
};


export const decryptSymmetric = async (ciphertext: string, password: string, salt: string, iv: string) => {
  const encodedCiphertext = new Uint8Array(atob(ciphertext).split('').map(char => char.charCodeAt(0)));
  const decodedSalt = new Uint8Array(atob(salt).split('').map(char => char.charCodeAt(0)));
  const decodedIv = new Uint8Array(atob(iv).split('').map(char => char.charCodeAt(0)));


  const secretKey = await deriveKeyFromPassword(password, decodedSalt);

  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-CBC',
      iv: decodedIv,
    },
    secretKey,
    encodedCiphertext
  );

  return plaintextBuffer;
};


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
          const { ciphertext, iv, salt } = await encryptSymmetric(data, password)

          const combinedMessage = `${iv}:${salt}:${ciphertext}`
          const encoder = new TextEncoder()
          const currentDataAsBytes = encoder.encode(combinedMessage)

          const maxCapacity = image.width * image.height * (2 + 2 + 4)
          const totalBitsNeeded = currentDataAsBytes.length * 8;
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
        async doRead(image: ImageData): Promise<ReadResult> {
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
          const [iv, salt, encryptedMessage] = decodedText.split(':')
          if (!iv || !salt || !encryptedMessage) {
            throw new Error(
              'Decoded data is incomplete. Ensure IV, salt, and encrypted message are correctly formatted.',
            )
          }
          console.log('Extracted IV (Base64):', iv)
          console.log('Extracted IV (Base64):', salt)
          console.log('Extracted Encrypted Message (Base64):', encryptedMessage)
          const decryptedMessage = await decryptSymmetric(encryptedMessage, password, salt, iv)

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
