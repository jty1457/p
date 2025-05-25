// src/components/livechat/MessageInput.js
import React, { useState } from 'react';

const MessageInput = ({ onSendMessage, isSending }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !isSending) {
      onSendMessage(text.trim(), 'text'); // 'text' as message type
      setText('');
    }
  };

  // Basic voice input placeholder (actual implementation requires Web Speech API or similar)
  const handleVoiceInput = () => {
    alert('Voice input feature not yet implemented.');
    // Example:
    // const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    // recognition.onresult = (event) => {
    //   const spokenText = event.results[0][0].transcript;
    //   onSendMessage(spokenText, 'voice_transcript');
    // };
    // recognition.start();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex' }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your message..."
        disabled={isSending}
        style={{ flexGrow: 1, padding: '10px', marginRight: '5px' }}
      />
      <button type="submit" disabled={isSending} style={{ padding: '10px' }}>
        {isSending ? 'Sending...' : 'Send'}
      </button>
      <button type="button" onClick={handleVoiceInput} disabled={isSending} style={{ padding: '10px', marginLeft: '5px' }}>
        🎤 Voice
      </button>
    </form>
  );
};
export default MessageInput;
