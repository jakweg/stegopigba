import React, { useEffect, useState } from 'react';

export default function MessageInputs({ 
  isReadMode, 
  requestRefresh, 
  isMultiMessageMode, 
  onMessagesChange, 
  onSingleMessageChange, 
  messages = [], 
  singleMessage = '' 
}) {
  const [localMessages, setLocalMessages] = useState(Array(6).fill(''));
  const [localSingleMessage, setLocalSingleMessage] = useState('');

  // Funkcja porównująca tablice
  const arraysAreEqual = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    return true;
  };


  useEffect(() => {
    if (isMultiMessageMode && !arraysAreEqual(messages, localMessages)) {
      setLocalMessages(messages);
    } else if (!isMultiMessageMode && singleMessage !== localSingleMessage) {
      setLocalSingleMessage(singleMessage);
    }
  }, [messages, singleMessage]);

  useEffect(() => {
    if (isMultiMessageMode && !arraysAreEqual(localMessages, messages)) {
      onMessagesChange(localMessages);
    } else if (!isMultiMessageMode && localSingleMessage !== singleMessage) {
      onSingleMessageChange(localSingleMessage); 
    }
  }, [localMessages, localSingleMessage]);

  const handleInputChange = (index, newValue) => {
    const newMessages = [...localMessages];
    newMessages[index] = newValue;
    setLocalMessages(newMessages);
    requestRefresh();
  };

  const handleSingleInputChange = (newValue) => {
    setLocalSingleMessage(newValue);
    requestRefresh();
  };

  return (
    <section>
      {isMultiMessageMode ? (
        localMessages.map((message, index) => (
          <textarea
            key={index}
            className={isReadMode ? 'readOnly' : undefined}
            readOnly={isReadMode}
            cols={10}
            value={message}
            onChange={e => handleInputChange(index, e.target.value)}
            placeholder={`Message ${index + 1}`}
          />
        ))
      ) : (
        <textarea
          className={isReadMode ? 'readOnly' : undefined}
          readOnly={isReadMode}
          cols={40}
          value={localSingleMessage}
          onChange={e => handleSingleInputChange(e.target.value)}
          placeholder="Enter your message"
        />
      )}
    </section>
  );
}
