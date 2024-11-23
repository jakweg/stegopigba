import React from 'react'

interface MessageInputsProps {
  hasError: boolean
  isReadMode: boolean
  requestRefresh: () => void
  isMultiMessageMode: boolean
  onMessagesChange: (messages: string[]) => void
  onSingleMessageChange: (message: string) => void
  singleMessage: string
  messages: string[]
}

export default function MessageInputs({
  hasError,
  isReadMode,
  requestRefresh,
  isMultiMessageMode,
  onMessagesChange,
  onSingleMessageChange,
  singleMessage = '',
  messages = [],
}: MessageInputsProps) {
  const handleMultipleInputChange = (index: number, newValue: string) => {
    const newMessages = [...messages]
    newMessages[index] = newValue
    onMessagesChange(newMessages)
    requestRefresh()
  }

  const handleSingleInputChange = (newValue: string) => {
    onSingleMessageChange(newValue)
    requestRefresh()
  }

  return (
    <section>
      {isMultiMessageMode ? (
        messages.map((message, index) => (
          <textarea
            className={hasError ? 'hasError' : undefined}
            key={index}
            readOnly={isReadMode}
            cols={10}
            value={message}
            onChange={e => handleMultipleInputChange(index, e.target.value)}
            placeholder={`Message ${index + 1}`}
          />
        ))
      ) : (
        <textarea
          className={hasError ? 'hasError' : undefined}
          readOnly={isReadMode}
          cols={40}
          value={singleMessage}
          onChange={e => handleSingleInputChange(e.target.value)}
          placeholder="Enter your message"
        />
      )}
    </section>
  )
}
