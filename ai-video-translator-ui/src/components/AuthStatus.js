// src/components/AuthStatus.js
import React, { useState, useEffect } from 'react';
import { auth } from '../config/firebaseConfig';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth'; // signInAnonymously for quick testing

const AuthStatus = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      // For testing, using anonymous sign-in. Replace with your actual login logic (e.g., email/password, Google)
      await signInAnonymously(auth);
      console.log("Signed in anonymously");
    } catch (error) {
      console.error("Anonymous sign-in failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Signed out");
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  if (loading) return <p>Loading auth status...</p>;

  return (
    <div>
      {user ? (
        <>
          <p>Logged in as: {user.isAnonymous ? "Anonymous User" : user.email} (UID: {user.uid})</p>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <p>Not logged in.</p>
          <button onClick={handleLogin}>Login Anonymously (Test)</button>
          {/* Add other login buttons here */}
        </>
      )}
    </div>
  );
};
export default AuthStatus;
