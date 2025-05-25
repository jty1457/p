// src/components/livechat/AvatarDisplay.js
import React from 'react';

// Initial simple avatar, can be replaced with more complex logic later
const DEFAULT_AVATAR_URL = 'https://via.placeholder.com/150?text=AI+Avatar';

const AvatarDisplay = ({ avatarUrl, isSpeaking }) => {
  const style = {
    border: isSpeaking ? '3px solid green' : '3px solid grey',
    borderRadius: '50%',
    width: '150px',
    height: '150px',
    objectFit: 'cover',
    margin: '20px auto'
  };
  return (
    <div>
      <img src={avatarUrl || DEFAULT_AVATAR_URL} alt="AI Avatar" style={style} />
    </div>
  );
};
export default AvatarDisplay;
