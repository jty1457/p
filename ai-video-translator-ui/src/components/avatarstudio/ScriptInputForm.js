// src/components/avatarstudio/ScriptInputForm.js
import React, { useState } from 'react';

const ScriptInputForm = ({ onSubmit, isProcessing }) => {
  const [script, setScript] = useState('');
  // const [voiceId, setVoiceId] = useState('default_voice'); // Example for voice selection

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!script.trim()) {
      alert('Please enter a script.');
      return;
    }
    // onSubmit({ script, voiceId });
    onSubmit({ script }); // Simplified for now
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
      <h3>Enter Script</h3>
      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Enter the script for the avatar to speak..."
        rows="5"
        style={{ width: 'calc(100% - 22px)', padding: '10px', marginBottom: '10px' }}
        disabled={isProcessing}
      />
      {/* 
              <div>
                <label htmlFor="voiceSelect">Choose Voice (Optional):</label>
                <select id="voiceSelect" value={voiceId} onChange={e => setVoiceId(e.target.value)} disabled={isProcessing}>
                  <option value="default_voice">Default Voice</option>
                  <option value="voice_1">Voice Option 1</option>
                </select>
              </div>
              */}
      <button type="submit" disabled={isProcessing} style={{ padding: '10px 15px' }}>
        {isProcessing ? 'Processing...' : 'Generate Avatar Video'}
      </button>
    </form>
  );
};
export default ScriptInputForm;
