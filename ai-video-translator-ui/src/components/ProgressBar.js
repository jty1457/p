// src/components/ProgressBar.js
import React from 'react';

const ProgressBar = ({ progress, statusText }) => {
  return (
    <div>
      <progress value={progress} max="100"></progress>
      <p>{statusText || `${progress}%`}</p>
    </div>
  );
};
export default ProgressBar;
