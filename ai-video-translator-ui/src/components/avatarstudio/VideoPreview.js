// src/components/avatarstudio/VideoPreview.js
// Similar to VideoPlayer.js from Translator, or can be enhanced
import React from 'react';

const VideoPreview = ({ videoUrl, title }) => {
  if (!videoUrl) return null;

  return (
    <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
      <h3>{title || 'Generated Video'}</h3>
      <video controls src={videoUrl} width="100%" style={{ maxWidth: '600px' }}></video>
      <br />
      <a href={videoUrl} download="avatar_video.mp4" target="_blank" rel="noopener noreferrer">
        Download Video
      </a>
    </div>
  );
};
export default VideoPreview;
