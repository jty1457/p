// src/pages/TranslatorPage.js
import React, { useState, useEffect } from 'react';
import VideoUploadForm from '../components/VideoUploadForm';
import ProgressBar from '../components/ProgressBar';
import VideoPlayer from '../components/VideoPlayer';
import { storage, auth, functions, db } from '../config/firebaseConfig'; // functions and db added
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import AuthStatus from '../components/AuthStatus';
import { httpsCallable } from 'firebase/functions'; // Functions
import { doc, onSnapshot } from 'firebase/firestore'; // Firestore listener

const TranslatorPage = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [originalVideoUrl, setOriginalVideoUrl] = useState('');
  const [translatedVideoUrl, setTranslatedVideoUrl] = useState('');
  const [userId, setUserId] = useState(null);
  const [jobId, setJobId] = useState(null); // Added jobId state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setJobId(null); // Clear job ID if user logs out
        console.log("User is not logged in. Uploads will be restricted or anonymous.");
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore listener for job updates
  useEffect(() => {
    if (!jobId) return;

    setProcessingStatus(`Subscribed to job ${jobId}. Waiting for updates...`);
    setUploadProgress(0); // Reset progress for the new job, backend will send actual progress

    const jobDocRef = doc(db, "translationJobs", jobId);
    const unsubscribe = onSnapshot(jobDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const jobData = docSnapshot.data();
        console.log("Job update received:", jobData);

        let statusMessage = `Job ${jobId}: ${jobData.status}`;
        if (jobData.statusDetail) {
          statusMessage += ` - ${jobData.statusDetail}`;
        }
        if (jobData.progress) {
          statusMessage += ` (${jobData.progress}%)`;
          setUploadProgress(jobData.progress);
        } else if (jobData.status === "queued" || jobData.status === "audio_extraction_pending") {
            // Keep upload progress at a low number until actual processing progress starts
            setUploadProgress(prevProgress => Math.max(0, Math.min(prevProgress, 5)));
        }


        setProcessingStatus(statusMessage);

        if (jobData.translatedVideoUrl) {
          setTranslatedVideoUrl(jobData.translatedVideoUrl);
        }

        if (jobData.status === "completed") {
          setUploadProgress(100);
          // Optionally clear jobId if no further updates are expected for this job
          // setJobId(null);
        } else if (jobData.status === "failed") {
          // Optionally clear jobId
          // setJobId(null);
        }
      } else {
        console.log("Job document not found (it may have been deleted or ID is incorrect)");
        setProcessingStatus(`Job ${jobId} not found.`);
      }
    }, (error) => {
      console.error("Error listening to job updates:", error);
      setProcessingStatus(`Error listening to job ${jobId}: ${error.message}`);
    });

    return () => {
      unsubscribe();
      setProcessingStatus(prevStatus => prevStatus.includes(jobId) ? "Listener stopped." : prevStatus);
    };
  }, [jobId]);

  const handleTranslationRequest = async (formData) => {
    console.log('Translation requested with:', formData);

    if (!userId) {
      alert("Please log in to upload videos.");
      setProcessingStatus("Error: User not logged in.");
      return;
    }

    if (!formData.videoFile) {
      alert('Please select a video file.');
      return;
    }

    setOriginalVideoUrl('');
    setTranslatedVideoUrl('');
    setJobId(null); // Clear previous job ID
    setUploadProgress(0);
    setProcessingStatus('Preparing to upload...');

    const videoFileName = `${Date.now()}_${formData.videoFile.name}`;
    const storagePath = `userData/${userId}/uploads/videos/${videoFileName}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, formData.videoFile);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(Math.round(progress));
        setProcessingStatus(`Uploading: ${Math.round(progress)}%`);
      },
      (error) => {
        console.error("Upload failed:", error);
        switch (error.code) {
          case 'storage/unauthorized':
            setProcessingStatus("Upload failed: You do not have permission to upload to this location.");
            break;
          case 'storage/canceled':
            setProcessingStatus("Upload canceled.");
            break;
          default:
            setProcessingStatus(`Upload failed: ${error.message}`);
        }
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log('File available at', downloadURL);
          setOriginalVideoUrl(downloadURL);
          setProcessingStatus('Video uploaded. Requesting translation job...');

          const requestTranslationFunction = httpsCallable(functions, 'requestVideoTranslation');
          requestTranslationFunction({
            videoUrl: downloadURL, // or storagePath, depending on function needs
            sourceLang: formData.sourceLang,
            targetLang: formData.targetLang,
            userId: userId,
            videoFileName: formData.videoFile.name // Send original file name
          })
            .then((result) => {
              const newJobId = result.data.jobId;
              setJobId(newJobId); // Store the job ID
              console.log('Translation job created successfully:', result.data);
              // Status will be updated by Firestore listener
              // setProcessingStatus(`Job ${newJobId} created. Status: ${result.data.initialStatus || 'queued'}`);
            })
            .catch((error) => {
              console.error('Error calling requestVideoTranslation function:', error);
              setProcessingStatus(`Error creating translation job: ${error.message}`);
            });

        }).catch(error => {
          console.error("Failed to get download URL:", error);
          setProcessingStatus("Failed to get video URL after upload.");
        });
      }
    );
  };

  return (
    <div>
      <AuthStatus />
      <h1>AI Video Translator</h1>
      <VideoUploadForm onSubmit={handleTranslationRequest} />
      {(uploadProgress > 0 || processingStatus || jobId) && // Show progress if jobId is set
        <ProgressBar progress={uploadProgress} statusText={processingStatus} />
      }
      <div style={{ display: 'flex', marginTop: '20px' }}>
        {originalVideoUrl && <VideoPlayer src={originalVideoUrl} title="Original Video" />}
        {translatedVideoUrl && <VideoPlayer src={translatedVideoUrl} title="Translated Video" />}
      </div>
    </div>
  );
};
export default TranslatorPage;
