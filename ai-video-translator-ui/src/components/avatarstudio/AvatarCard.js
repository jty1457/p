// src/components/avatarstudio/AvatarCard.js
import React from 'react';
import './AvatarCard.css'; // Create this CSS file

const AvatarCard = ({ avatar, onSelect, isSelected }) => {
  const cardStyle = {
    border: isSelected ? '2px solid #007bff' : '2px solid #eee',
    padding: '10px',
    margin: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    width: '150px',
    display: 'inline-block', // Or use flex in parent
  };

  return (
    <div style={cardStyle} onClick={() => onSelect(avatar.id)} className="avatar-card">
      <img src={avatar.thumbnailUrl || 'https://via.placeholder.com/100?text=Avatar'} alt={avatar.name} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }} />
      <h4>{avatar.name || 'Unnamed Avatar'}</h4>
    </div>
  );
};
export default AvatarCard;
