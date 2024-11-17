<<<<<<< HEAD
import React, { useEffect, useState } from 'react'
=======
import React from 'react'
>>>>>>> 4600443d2ee2144a922958ff260eb254ac8d92af

interface MessageInputsProps {
  isReadMode: boolean
  requestRefresh: () => void
  isMultiMessageMode: boolean
  onMessagesChange: (messages: string[]) => void
  onSingleMessageChange: (message: string) => void
  singleMessage: string
  messages: string[]
}

export default function MessageInputs({
  isReadMode,
  requestRefresh,
  isMultiMessageMode,
  onMessagesChange,
  onSingleMessageChange,
  singleMessage = '',
  messages = [],
}: MessageInputsProps) {
<<<<<<< HEAD
  // const [localMessages, setLocalMessages] = useState<string[]>(Array(6).fill(''));
  // const [localSingleMessage, setLocalSingleMessage] = useState<string>('');

  // const arraysAreEqual = (arr1: string[], arr2: string[]): boolean  => {
  //   if (arr1.length !== arr2.length) return false;
  //   for (let i = 0; i < arr1.length; i++) {
  //     if (arr1[i] !== arr2[i]) return false;
  //   }
  //   return true;
  // };

  // useEffect(() => {
  //   if (isMultiMessageMode && !arraysAreEqual(messages, localMessages)) {
  //     setLocalMessages(messages);
  //   } else if (!isMultiMessageMode && singleMessage !== localSingleMessage) {
  //     setLocalSingleMessage(singleMessage);
  //   }
  // }, [messages, singleMessage]);

  // useEffect(() => {
  //   if (isMultiMessageMode && !arraysAreEqual(localMessages, messages)) {
  //     onMessagesChange(localMessages);
  //   } else if (!isMultiMessageMode && localSingleMessage !== singleMessage) {
  //     onSingleMessageChange(localSingleMessage);
  //   }
  // }, [localMessages, localSingleMessage]);

  // const handleMultipleInputChange = (index: number, newValue: string) => {
  //   console.log(`Message ${index}:`, newValue);
  //   const newMessages = [...localMessages];
  //   newMessages[index] = newValue;
  //   setLocalMessages(newMessages);
  //   onMessagesChange(newMessages)
  //   requestRefresh();
  // };

  // useEffect(() => {
  //   if (isMultiMessageMode) {
  //     console.log("Current Messages (local):", localMessages); // Loguj aktualne wiadomości
  //   } else {
  //     console.log("Current Single Message (local):", localSingleMessage); // Loguj pojedynczą wiadomość
  //   }
  // }, [localMessages, localSingleMessage, isMultiMessageMode]);

  // const handleSingleInputChange = (newValue: string) => {
  //   console.log("Single Message:", newValue);
  //   setLocalSingleMessage(newValue);
  //   requestRefresh();
  // };

=======
>>>>>>> 4600443d2ee2144a922958ff260eb254ac8d92af
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
