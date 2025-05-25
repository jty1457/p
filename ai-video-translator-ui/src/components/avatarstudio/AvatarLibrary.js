// src/components/avatarstudio/AvatarLibrary.js
import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import AvatarCard from './AvatarCard';

const AvatarLibrary = ({ selectedAvatarId, onAvatarSelect }) => {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        setLoading(true);
        setError(null);
        const avatarsRef = collection(db, 'avatars');
        // Example: query(avatarsRef, orderBy('name'));
        const q = query(avatarsRef, orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);
        const avatarsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAvatars(avatarsData);
      } catch (err) {
        console.error("Error fetching avatars:", err);
        setError("Failed to load avatars. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchAvatars();
  }, []);

  if (loading) return <p>Loading avatars...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (avatars.length === 0) return <p>No avatars available. Please add some to the 'avatars' collection in Firestore.</p>;

  return (
    <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
      <h3>Select an Avatar</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {avatars.map(avatar => (
          <AvatarCard
            key={avatar.id}
            avatar={avatar}
            onSelect={onAvatarSelect}
            isSelected={selectedAvatarId === avatar.id}
          />
        ))}
      </div>
    </div>
  );
};
export default AvatarLibrary;
