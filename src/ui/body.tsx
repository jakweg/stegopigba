import React, { useCallback, useEffect, useRef, useState } from 'react'
import ImageToWorkOn from './image-to-work-on'
import allModes from '../modes/all-modes'
import { ExecutionHandle } from '../modes/template'
import ModePicker from './mode-picker'
import { downloadCanvasToPng } from '../util'
import MessageInputs from './message-input'

export default () => {
  const canvas = useRef<HTMLCanvasElement>(null)
  const context = useRef<CanvasRenderingContext2D>()

  const executorHandle = useRef<ExecutionHandle>(null)
  const [isReadMode, setReadMode] = useState(false)
  const [wantsToRefresh, setWantsToRefresh] = useState(false)
  const [storageText, setStorageText] = useState('?')
  // const [textInput, setTextInput] = useState('')
  const [messages, setMessages] = useState([]);
  const [singleMessage, setSingleMessage] = useState('');
  const [originalImage, setOriginalFile] = useState<HTMLImageElement | null>(null)
  const [selectedModeIndex, setSelectedModeIndex] = useState(-1)
  const [hasError, setHasError] = useState(false)
  const [isMultiMessageMode, setIsMultiMessageMode] = useState(false);

  const ModeComponent = allModes[selectedModeIndex]


  const requestRefresh = useCallback(() => {
    setWantsToRefresh(true)
  }, [])

  useEffect(() => {
    if (!wantsToRefresh) return

    setWantsToRefresh(value => {
      if (!value) return false
      if (isMultiMessageMode){
        console.log("messages to be written to image", messages);
        return false
      }
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
          setSingleMessage(decodedText)
        } catch (e) {
          console.error('Failed to get data from image', e)
          setSingleMessage('Failed to read from image')
          setHasError(true)
        }
      } else {
        try {
          const encoder = new TextEncoder()
          const currentDataAsBytes = encoder.encode(singleMessage)
          currentDataSizeBytes = currentDataAsBytes.length
          executorHandle.current?.doWrite(imageData, currentDataAsBytes)
          contextInstance.putImageData(imageData, 0, 0)
        } catch (e) {
          console.error('Failed to write data to image', e)
          setSingleMessage('Failed to write data to image')
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
  }, [wantsToRefresh, selectedModeIndex, singleMessage])

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

        <ModePicker
          onChange={i => {
            setSelectedModeIndex(i)
            requestRefresh()
            console.log("mode", ModeComponent.label);
            // it should be oposit way?
            ModeComponent.label === "2-2-4 LSB" ? setIsMultiMessageMode(false) : setIsMultiMessageMode(true)
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
          isReadMode={isReadMode}
          requestRefresh={requestRefresh}
          isMultiMessageMode={isMultiMessageMode}
          onMessagesChange={setMessages}
          onSingleMessageChange={setSingleMessage}
          singleMessage={singleMessage}
          messages={messages}
        />

        {/* <section>
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
        </section> */}

        <button onClick={downloadImage}>Download image</button>
      </aside>
    </>
  )
}
