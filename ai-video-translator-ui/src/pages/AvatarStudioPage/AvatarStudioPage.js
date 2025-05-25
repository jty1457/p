// src/pages/AvatarStudioPage/AvatarStudioPage.js
import React, { useState, useEffect } from 'react';
import AvatarLibrary from '../../components/avatarstudio/AvatarLibrary';
import ScriptInputForm from '../../components/avatarstudio/ScriptInputForm';
import VideoPreview from '../../components/avatarstudio/VideoPreview';
import JobStatusDisplay from '../../components/avatarstudio/JobStatusDisplay';
import AuthStatus from '../../components/AuthStatus';

import { functions, db, auth } from '../../config/firebaseConfig'; // Firebase services
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const AvatarStudioPage = () => {
  const [userId, setUserId] = useState(null);
  const [selectedAvatarId, setSelectedAvatarId] = useState(null);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobDetails, setJobDetails] = useState({
    status: null,
    statusDetail: null,
    progress: 0,
    error: null,
    resultVideoUrl: null,
  });
  const [isProcessing, setIsProcessing] = useState(false); // For disabling form

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
      if (!user) { // Reset on logout
        setSelectedAvatarId(null);
        setCurrentJobId(null);
        setJobDetails({ status: null, statusDetail: null, progress: 0, error: null, resultVideoUrl: null });
        setIsProcessing(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Job status listener
  useEffect(() => {
    if (!currentJobId) {
      // Clear old job details if no current job or if user logs out etc.
      if (jobDetails.status && jobDetails.status !== 'completed' && jobDetails.status !== 'failed') {
         // Only reset if there was an active job that didn't finish
        setJobDetails({ status: 'No active job.', statusDetail: null, progress: 0, error: null, resultVideoUrl: null });
      }
      return;
    }

    setIsProcessing(true); // A job is active
    const jobDocRef = doc(db, 'avatarVideoJobs', currentJobId); // Assuming 'avatarVideoJobs' collection
    const unsubscribe = onSnapshot(jobDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setJobDetails({
          status: data.status,
          statusDetail: data.statusDetail,
          progress: data.progress || 0,
          error: data.errorMessage,
          resultVideoUrl: data.resultVideoUrl,
        });
        if (data.status === 'completed' || data.status === 'failed') {
          setIsProcessing(false);
        }
      } else {
        setJobDetails({ status: 'Job not found.', error: 'The job ID is invalid or has been deleted.', resultVideoUrl: null, progress: 0, statusDetail: null });
        setIsProcessing(false);
        setCurrentJobId(null); // Clear job ID if not found
      }
    }, (error) => {
      console.error("Error listening to avatar job:", error);
      setJobDetails({ status: 'Error', error: 'Failed to listen to job updates.', resultVideoUrl: null, progress: 0, statusDetail: null });
      setIsProcessing(false);
    });

    return () => unsubscribe();
  }, [currentJobId, jobDetails.status]); // Added jobDetails.status to dependency array to allow resetting if job was active but no longer is.

  const handleAvatarSelection = (avatarId) => {
    setSelectedAvatarId(avatarId);
    // Reset job details if a new avatar is selected while a previous job's result is shown
    if (jobDetails.resultVideoUrl || jobDetails.error) {
        setCurrentJobId(null); // This will trigger the useEffect for currentJobId to clear details
        setJobDetails({ status: null, statusDetail: null, progress: 0, error: null, resultVideoUrl: null });
    }
  };

  const handleScriptSubmit = async (formData) => {
    if (!userId) {
      alert('Please log in to generate videos.');
      return;
    }
    if (!selectedAvatarId) {
      alert('Please select an avatar first.');
      return;
    }

    setIsProcessing(true);
    setJobDetails({ status: 'Initializing job...', progress: 0, error: null, resultVideoUrl: null, statusDetail: null });
    setCurrentJobId(null); // Clear previous job ID before starting a new one

    const requestAvatarVideoFunction = httpsCallable(functions, 'requestAvatarVideo'); // Target Cloud Function
    try {
      const result = await requestAvatarVideoFunction({
        avatarId: selectedAvatarId,
        script: formData.script,
        // voiceId: formData.voiceId, // If voice selection is added
        userId: userId,
      });
      if (result.data && result.data.jobId) {
        setCurrentJobId(result.data.jobId);
        // Status will be updated by the listener
      } else {
        throw new Error(result.data.message || "Failed to initialize job.");
      }
    } catch (error) {
      console.error('Error requesting avatar video generation:', error);
      setJobDetails({ status: 'Failed', error: error.message, resultVideoUrl: null, progress: 0, statusDetail: "Could not submit generation request." });
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <AuthStatus />
      <h2>AI Human (Avatar Studio)</h2>
      {!userId && <p>Please log in to use the Avatar Studio.</p>}
      {userId && (
        <>
          <AvatarLibrary selectedAvatarId={selectedAvatarId} onAvatarSelect={handleAvatarSelection} />
          {selectedAvatarId && <p>Selected Avatar ID: {selectedAvatarId}</p>}
          <ScriptInputForm onSubmit={handleScriptSubmit} isProcessing={isProcessing} />
          <JobStatusDisplay jobId={currentJobId} {...jobDetails} />
          {jobDetails.resultVideoUrl && <VideoPreview videoUrl={jobDetails.resultVideoUrl} />}
        </>
      )}
    </div>
  );
};
export default AvatarStudioPage;
