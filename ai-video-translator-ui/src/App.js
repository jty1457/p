// src/App.js
import React, { useState } from 'react';
import './App.css';
import TranslatorPage from './pages/TranslatorPage';
import LiveChatPage from './pages/LiveChatPage/LiveChatPage';
import AvatarStudioPage from './pages/AvatarStudioPage/AvatarStudioPage'; // Add this

function App() {
  const [currentPage, setCurrentPage] = useState('translator'); // 'translator', 'livechat', or 'avatarstudio'

  return (
    <div className="App">
      <nav style={{ padding: '10px', borderBottom: '1px solid #ccc', marginBottom: '20px' }}>
        <button onClick={() => setCurrentPage('translator')} style={{ marginRight: '10px' }}>AI Video Translator</button>
        <button onClick={() => setCurrentPage('livechat')} style={{ marginRight: '10px' }}>AI Live Chat</button>
        <button onClick={() => setCurrentPage('avatarstudio')}>AI Avatar Studio</button>
      </nav>
      {currentPage === 'translator' && <TranslatorPage />}
      {currentPage === 'livechat' && <LiveChatPage />}
      {currentPage === 'avatarstudio' && <AvatarStudioPage />}
    </div>
  );
}
export default App;
