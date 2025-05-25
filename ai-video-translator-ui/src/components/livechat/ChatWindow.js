// src/components/livechat/ChatWindow.js
import React, { useEffect, useRef } from 'react';
import './ChatWindow.css'; // Create this CSS file for styling

const ChatWindow = ({ messages, userId }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  if (!messages) return <p>Loading messages...</p>;
  if (messages.length === 0) return <p>No messages yet. Start the conversation!</p>;

  return (
    <div className="chat-window">
      {messages.map((msg) => (
        <div key={msg.id} className={`message ${msg.sender === userId ? 'user' : 'ai'}`}>
          <div className="message-bubble">
            <p><strong>{msg.sender === userId ? 'You' : 'AI'}:</strong> {msg.content}</p>
            <span className="timestamp">{msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() : ''}</span>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
export default ChatWindow;
