import React, { useCallback, useEffect, useRef, useState } from 'react'
import ImageToWorkOn from './image-to-work-on'
import allModes from '../modes/all-modes'
import { ExecutionHandle } from '../modes/template'
import ModePicker from './mode-picker'
import { downloadCanvasToPng } from '../util/generic'
import MessageInputs from './message-input'

export default () => {
  const canvas = useRef<HTMLCanvasElement>(null)
  const context = useRef<CanvasRenderingContext2D>()

  const executorHandle = useRef<ExecutionHandle>(null)
  const [isReadMode, setReadMode] = useState(false)
  const wantsToRefresh = useRef(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [storageText, setStorageText] = useState('?')
  const [messages, setMessages] = useState<string[]>(Array(6).fill(''))
  const [singleMessage, setSingleMessage] = useState('')
  const [originalImage, setOriginalFile] = useState<HTMLImageElement | null>(null)
  const [selectedModeIndex, setSelectedModeIndex] = useState(-1)
  const [hasError, setHasError] = useState(false)
  const [psnrValue, setPsnrValue] = useState<number | null>(null)
  const [isMultiMessageMode, setIsMultiMessageMode] = useState(false)

  const ModeComponent = allModes[selectedModeIndex]

  const requestRefresh = useCallback(() => {
    wantsToRefresh.current = true
    setRefreshCounter(c => c + 1)
  }, [])

  useEffect(() => {
    if (!wantsToRefresh.current) return

    wantsToRefresh.current = false
    ;(async () => {
      if (!ModeComponent) return false

      const canvasInstance = canvas.current
      if (!canvasInstance) return false
      if (!originalImage) return false
      const contextInstance = context.current!
      canvasInstance.width = originalImage.width
      canvasInstance.height = originalImage.height

      let currentDataSizeBytes = 0
      const totalCapacityBits =
        executorHandle.current?.calculateMaxStorageCapacityBits(canvasInstance.width, canvasInstance.height) ?? 1

      contextInstance?.drawImage(originalImage, 0, 0)
      if (!executorHandle.current) return false
      const originalImageData = contextInstance.getImageData(0, 0, canvasInstance.width, canvasInstance.height, {
        colorSpace: 'srgb',
      })

      const imageData = contextInstance.getImageData(0, 0, canvasInstance.width, canvasInstance.height, {
        colorSpace: 'srgb',
      })
      if (!imageData) return false

      setHasError(false)
      if (isReadMode) {
        try {
          const result = await executorHandle.current?.doRead(imageData)
          if (result === 'failed') throw new Error('Failed to read data from image')
          if (Array.isArray(result)) {
            const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
            const decodedMessages = result.map(message => decoder.decode(message))
            decodedMessages.forEach(message => (currentDataSizeBytes = currentDataSizeBytes + message.length))
            setMessages(decodedMessages)
          } else {
            const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
            const decodedText = decoder.decode(result)
            currentDataSizeBytes = result.length
            setSingleMessage(decodedText)
          }
        } catch (e) {
          console.error('Failed to get data from image', e)
          if (isMultiMessageMode) {
            setMessages(Array(6).fill('Failed to write data to image'))
          } else {
            setSingleMessage('Failed to read from image')
          }
          setHasError(true)
        }
      } else {
        try {
          const encoder = new TextEncoder()
          if (ModeComponent.supportedInput === '6-text') {
            const encodedMessages = messages.map(message => encoder.encode(message))
            await executorHandle.current?.doWrite(imageData, encodedMessages)
            encodedMessages.forEach(message => (currentDataSizeBytes = currentDataSizeBytes + message.length))
          } else {
            const currentDataAsBytes = encoder.encode(singleMessage)
            await executorHandle.current?.doWrite(imageData, currentDataAsBytes)
            currentDataSizeBytes = currentDataAsBytes.length
          }
          if (executorHandle.current?.calculatePSNR) {
            const psnr = executorHandle.current.calculatePSNR(originalImageData, imageData)
            console.info(`PSNR: ${psnr.toFixed(2)} dB`)
            setPsnrValue(psnr)
          } else {
            console.warn('calculatePSNR is not implemented.')
          }

          contextInstance.putImageData(imageData, 0, 0)
        } catch (e) {
          console.error('Failed to write data to image', e)
          if (isMultiMessageMode) {
            setMessages(Array(6).fill('Failed to write data to image'))
          } else {
            setSingleMessage('Failed to write data to image')
          }
          setHasError(true)
        }

        setStorageText(
          `Data takes ${currentDataSizeBytes}B out of ${totalCapacityBits}B which is ${(
            ((currentDataSizeBytes * 8) / totalCapacityBits) *
            100
          ).toFixed(2)}%`,
        )
      }

      return false
    })()
  }, [refreshCounter, selectedModeIndex, singleMessage, messages, ModeComponent])

  useEffect(() => {
    context.current = canvas.current?.getContext?.('2d', {
      alpha: true,
      willReadFrequently: true,
    })!
  }, [])

  const downloadImage = useCallback(() => {
    downloadCanvasToPng(canvas.current!, 'encoded.png')
  }, [])

  return (
    <>
      <main>
        <canvas ref={canvas}></canvas>
      </main>
      <aside>
        <ImageToWorkOn
          setImage={i => {
            setOriginalFile(i)
            requestRefresh()
          }}
        />

        <label>
          Read:{' '}
          <input
            type="checkbox"
            checked={isReadMode}
            onChange={e => {
              setReadMode(e.target.checked)
              setSingleMessage('')
              requestRefresh()
            }}
          />
        </label>

        <label>
          <p>{storageText}</p>
        </label>
        <label>
          <p>{psnrValue !== null ? `PSNR: ${psnrValue.toFixed(2)} dB` : 'PSNR not calculated'}</p>
        </label>

        <ModePicker
          onChange={i => {
            setSelectedModeIndex(i)
            requestRefresh()
          }}
        />

        {ModeComponent && (
          <ModeComponent.OptionsComponent
            isReadMode={isReadMode}
            executor={executorHandle}
            requestRefresh={requestRefresh}
          />
        )}

        <MessageInputs
          hasError={hasError}
          isReadMode={isReadMode}
          requestRefresh={requestRefresh}
          isMultiMessageMode={ModeComponent?.supportedInput === '6-text'}
          onMessagesChange={setMessages}
          onSingleMessageChange={setSingleMessage}
          singleMessage={singleMessage}
          messages={messages}
        />

        <button onClick={downloadImage}>Download image</button>
      </aside>
    </>
  )
}
