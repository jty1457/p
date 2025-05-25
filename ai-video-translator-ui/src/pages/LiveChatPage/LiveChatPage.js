// src/pages/LiveChatPage/LiveChatPage.js
import React, { useState, useEffect, useCallback } from 'react';
import AvatarDisplay from '../../components/livechat/AvatarDisplay';
import ChatWindow from '../../components/livechat/ChatWindow';
import MessageInput from '../../components/livechat/MessageInput';
import AuthStatus from '../../components/AuthStatus'; // Re-use for login status

import { db, auth } from '../../config/firebaseConfig'; // Firestore & Auth
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  where,
  getDocs,
  doc,
  setDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const LiveChatPage = () => {
  const [userId, setUserId] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [aiIsSpeaking, setAiIsSpeaking] = useState(false); // For Avatar animation later

  // Effect for user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setCurrentSessionId(null); // Clear session if user logs out
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect for fetching/creating chat session and loading messages
  useEffect(() => {
    if (!userId) return;

    const getOrCreateSession = async () => {
      // Simple logic: try to find an active session or create a new one.
      // More complex logic might involve listing sessions, etc.
      const sessionsRef = collection(db, 'liveChatSessions');
      const q = query(sessionsRef, where('userId', '==', userId), where('status', '==', 'active'), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const sessionDoc = querySnapshot.docs[0];
        setCurrentSessionId(sessionDoc.id);
        console.log("Found active session:", sessionDoc.id);
      } else {
        const newSessionRef = doc(collection(db, 'liveChatSessions')); // Auto-generate ID
        await setDoc(newSessionRef, {
          userId: userId,
          startTime: serverTimestamp(),
          status: 'active', // 'active', 'ended'
          // assistantId: 'default_ai' // Can be set later
        });
        setCurrentSessionId(newSessionRef.id);
        console.log("Created new session:", newSessionRef.id);
      }
    };

    getOrCreateSession();
  }, [userId]);


  // Effect for listening to new messages in the current session
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]); // Clear messages if no session
      return;
    }

    console.log(`Listening to messages for session: ${currentSessionId}`);
    const messagesRef = collection(db, 'liveChatSessions', currentSessionId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50)); // Get last 50 messages

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newMessages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(newMessages);
      // Check if the last message is from AI to toggle speaking state (basic)
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].sender !== userId) {
        setAiIsSpeaking(true); // Simulate AI speaking
        setTimeout(() => setAiIsSpeaking(false), 2000); // Simulate end of speech
      }
    }, (error) => {
      console.error("Error listening to messages:", error);
    });

    return () => unsubscribe();
  }, [currentSessionId, userId]); // Add userId to dependencies

  const handleSendMessage = async (content, type) => {
    if (!userId || !currentSessionId) {
      alert('You must be logged in and in a session to send messages.');
      return;
    }
    if (!content.trim()) return;

    setIsSending(true);
    const messagesRef = collection(db, 'liveChatSessions', currentSessionId, 'messages');
    try {
      await addDoc(messagesRef, {
        content: content,
        sender: userId, // User's UID
        type: type, // 'text', 'voice_transcript'
        timestamp: serverTimestamp(),
      });
      // AI response will be handled by a Cloud Function listening to this new message
      // For now, simulate AI response for testing UI
      // simulateAIResponse(content);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  // Placeholder for AI response simulation (will be replaced by Cloud Function)
  /*
  const simulateAIResponse = async (userInput) => {
    if (!currentSessionId) return;
    setAiIsSpeaking(true);
    setTimeout(async () => {
      const messagesRef = collection(db, 'liveChatSessions', currentSessionId, 'messages');
      await addDoc(messagesRef, {
        content: `AI Echo: ${userInput}`,
        sender: 'ai_assistant_01',
        type: 'text',
        timestamp: serverTimestamp(),
      });
      setAiIsSpeaking(false);
    }, 1500);
  };
  */

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <AuthStatus />
      <h2>AI Live Chat</h2>
      {!userId && <p>Please log in to start chatting.</p>}
      {userId && !currentSessionId && <p>Loading chat session...</p>}
      {userId && currentSessionId && (
        <>
          <p>Session ID: {currentSessionId}</p>
          <AvatarDisplay avatarUrl={null} isSpeaking={aiIsSpeaking} />
          <ChatWindow messages={messages} userId={userId} />
          <MessageInput onSendMessage={handleSendMessage} isSending={isSending} />
        </>
      )}
    </div>
  );
};
export default LiveChatPage;
