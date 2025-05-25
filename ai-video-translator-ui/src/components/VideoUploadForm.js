// src/components/VideoUploadForm.js
import React, { useState } from 'react';

const VideoUploadForm = ({ onSubmit }) => {
  const [videoFile, setVideoFile] = useState(null);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ko');

  const handleFileChange = (e) => {
    setVideoFile(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!videoFile) {
      alert('Please select a video file.');
      return;
    }
    onSubmit({ videoFile, sourceLang, targetLang });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="videoFile">Upload Video:</label>
        <input type="file" id="videoFile" accept="video/*" onChange={handleFileChange} />
      </div>
      <div>
        <label htmlFor="sourceLang">Source Language:</label>
        <select id="sourceLang" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
          <option value="en">English</option>
          <option value="ko">Korean</option>
          <option value="ja">Japanese</option>
          {/* Add more languages as needed */}
        </select>
      </div>
      <div>
        <label htmlFor="targetLang">Target Language:</label>
        <select id="targetLang" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
          <option value="ko">Korean</option>
          <option value="en">English</option>
          <option value="ja">Japanese</option>
          {/* Add more languages as needed */}
        </select>
      </div>
      <button type="submit">Request Translation</button>
    </form>
  );
};
export default VideoUploadForm;
