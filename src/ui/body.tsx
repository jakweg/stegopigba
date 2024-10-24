import React, { useCallback, useEffect, useRef, useState } from 'react'
import ImageToWorkOn from './image-to-work-on'
import allModes from '../modes/all-modes'
import { ExecutionHandle } from '../modes/template'
import ModePicker from './mode-picker'
import { downloadCanvasToPng } from '../util'

export default () => {
  const canvas = useRef<HTMLCanvasElement>(null)
  const context = useRef<CanvasRenderingContext2D>()

  const executorHandle = useRef<ExecutionHandle>(null)
  const [isReadMode, setReadMode] = useState(false)
  const [wantsToRefresh, setWantsToRefresh] = useState(false)
  const [storageText, setStorageText] = useState('?')
  const [textInput, setTextInput] = useState('')
  const [originalImage, setOriginalFile] = useState<HTMLImageElement | null>(null)
  const [selectedModeIndex, setSelectedModeIndex] = useState(-1)
  const [hasError, setHasError] = useState(false)

  const ModeComponent = allModes[selectedModeIndex]

  const requestRefresh = useCallback(() => {
    setWantsToRefresh(true)
  }, [])

  useEffect(() => {
    if (!wantsToRefresh) return

    setWantsToRefresh(value => {
      if (!value) return false

      setStorageText('?')
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

      const imageData = contextInstance.getImageData(0, 0, canvasInstance.width, canvasInstance.height, {
        colorSpace: 'srgb',
      })
      if (!imageData) return false

      setHasError(false)
      if (isReadMode) {
        try {
          const result = executorHandle.current?.doRead(imageData)
          if (result === 'failed') throw new Error('Failed to read data from image')
          currentDataSizeBytes = result.length
          const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
          const decodedText = decoder.decode(result)
          setTextInput(decodedText)
        } catch (e) {
          console.error('Failed to get data from image', e)
          setTextInput('Failed to read from image')
          setHasError(true)
        }
      } else {
        try {
          const encoder = new TextEncoder()
          const currentDataAsBytes = encoder.encode(textInput)
          currentDataSizeBytes = currentDataAsBytes.length
          executorHandle.current?.doWrite(imageData, currentDataAsBytes)
          contextInstance.putImageData(imageData, 0, 0)
        } catch (e) {
          console.error('Failed to write data to image', e)
          setTextInput('Failed to write data to image')
          setHasError(true)
        }
      }

      setStorageText(
        `Data takes ${currentDataSizeBytes}B out of ${totalCapacityBits}B which is ${(
          ((currentDataSizeBytes * 8) / totalCapacityBits) *
          100
        ).toFixed(2)}%`,
      )
      return false
    })
  }, [wantsToRefresh, selectedModeIndex, textInput])

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
              setTextInput('')
              requestRefresh()
            }}
          />
        </label>

        <label>
          <p>{storageText}</p>
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

        <section>
          <textarea
            className={hasError ? 'hasError' : undefined}
            readOnly={isReadMode}
            cols={10}
            value={textInput}
            onChange={e => {
              setTextInput(e.target.value)
              requestRefresh()
            }}
          />
        </section>

        <button onClick={downloadImage}>Download image</button>
      </aside>
    </>
  )
}
