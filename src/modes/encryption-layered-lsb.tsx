import React, { useImperativeHandle, useState } from 'react'
import { Mode, ReadResult } from './template'
import { ReadableBitStream, WritableBitStream } from '../bit-stream'
import { calculatePSNR } from '../util'


function caesarEncryptWithCustomAlphabet(text, shift, alphabet) {
  return text.split('').map(char => {
    const index = alphabet.indexOf(char); 
    if (index === -1) return char; 
    const newIndex = (index + shift) % alphabet.length;
    return alphabet[newIndex];
  }).join('');
}


function caesarDecryptWithCustomAlphabet(text, shift, alphabet) {
  return text.split('').map(char => {
    const index = alphabet.indexOf(char);
    if (index === -1) return char;
    const newIndex = (index - shift + alphabet.length) % alphabet.length; 
    return alphabet[newIndex];
  }).join('');
}


function encryptRailFence(text, key) {
  // create the matrix to cipher plain text
  // key = rows , text.length = columns
  const rail = new Array(key).fill().map(() => new Array(text.length).fill('\n'));
 
  // filling the rail matrix to distinguish filled
  // spaces from blank ones
  let dir_down = false;
  let row = 0, col = 0;
 
  for (let i = 0; i < text.length; i++) {
    // check the direction of flow
    // reverse the direction if we've just
    // filled the top or bottom rail
    if (row == 0 || row == key - 1) dir_down = !dir_down;
 
    // fill the corresponding alphabet
    rail[row][col++] = text[i];
 
    // find the next row using direction flag
    dir_down ? row++ : row--;
  }
 
  // now we can construct the cipher using the rail matrix
  let result = '';
  for (let i = 0; i < key; i++)
    for (let j = 0; j < text.length; j++)
      if (rail[i][j] != '\n') result += rail[i][j];
 
  return result;
}


function decryptRailFence(cipher, key) {
  // create the matrix to cipher plain text
  // key = rows , text.length = columns
const rail = Array.from({ length: key }, () => Array(cipher.length).fill('\n'));

 
  // filling the rail matrix to mark the places with '*'
  let dir_down = false;
  let row = 0, col = 0;
 
  for (let i = 0; i < cipher.length; i++) {
    // check the direction of flow
    if (row == 0) dir_down = true;
    if (row == key - 1) dir_down = false;
 
    // place the marker
    rail[row][col++] = '*';
 
    // find the next row using direction flag
    dir_down ? row++ : row--;
  }
 
  // now we can construct the rail matrix by filling the marked places with cipher text
  let index = 0;
  for (let i = 0; i < key; i++)
    for (let j = 0; j < cipher.length; j++)
      if (rail[i][j] == '*' && index < cipher.length) rail[i][j] = cipher[index++];
 
  // now read the matrix in zig-zag manner to construct the resultant text
  let result = '';
  row = 0, col = 0;
  for (let i = 0; i < cipher.length; i++) {
    // check the direction of flow
    if (row == 0) dir_down = true;
    if (row == key - 1) dir_down = false;
 
    // place the marker
    if (rail[row][col] != '*') result += rail[row][col++];
 
    // find the next row using direction flag
    dir_down ? row++ : row--;
  }
 
  return result;
}


function createShiftedAlphabet(alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"): string {
  let newalpha = Array.from(alphabet);

  for (let i = 0; i < 1000; i++) {
    const location1 = Math.floor(Math.random() * newalpha.length);
    const location2 = Math.floor(Math.random() * newalpha.length);
  
    [newalpha[location1], newalpha[location2]] = [newalpha[location2], newalpha[location1]];
  }

  return newalpha.join('');
}



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
        doWrite(image: ImageData, data: Uint8Array){
          const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
          const encoder = new TextEncoder();

          
          const plaintextMessage = decoder.decode(data)
          const alphabet = createShiftedAlphabet()
          const shift = 3;
          const encryptedByCaesar = caesarEncryptWithCustomAlphabet(plaintextMessage, shift, alphabet);
          const encryptedByRailFence = encryptRailFence(encryptedByCaesar, 3)
          const message = `${alphabet}:${encryptedByRailFence}`;
          const messageB64Encoded = btoa(message)
          const currentDataAsBytes = encoder.encode(messageB64Encoded)

          const maxCapacity = image.width * image.height * 3 * 2;
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
            throw new Error(`Invalid data length: ${length}`);
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
          const [alphabet, encryptedMessage] = plaintextMessage.split(":")


          const decryptedByRailFence = decryptRailFence(encryptedMessage, 3)
          const shift = 3;
          const decryptedByCaesar = caesarDecryptWithCustomAlphabet(decryptedByRailFence, shift, alphabet)

          const encoder = new TextEncoder();
          return encoder.encode(decryptedByCaesar);
        },
        calculatePSNR(originalImage: ImageData, encodedImage: ImageData): number {
          return calculatePSNR(originalImage, encodedImage)
        },
      }),
      [],
    )

    return (
      <section>
        <label>
          Use bits: 2
        </label>
      </section>
    )
  },
} satisfies Mode
