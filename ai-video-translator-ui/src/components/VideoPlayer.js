// src/components/VideoPlayer.js
import React from 'react';

const VideoPlayer = ({ src, title }) => {
  if (!src) return null;
  return (
    <div>
      <h3>{title}</h3>
      <video controls src={src} width="600"></video>
    </div>
  );
};
export default VideoPlayer;
