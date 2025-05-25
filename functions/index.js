// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const textToSpeech = require("@google-cloud/text-to-speech"); // Added for TTS

admin.initializeApp();

const db = admin.firestore();

// Initialize Google Cloud Text-to-Speech Client
let ttsClient;
try {
  ttsClient = new textToSpeech.TextToSpeechClient();
  console.log("Google Cloud Text-to-Speech client initialized successfully.");
} catch (error) {
  console.error("Failed to initialize Google Cloud Text-to-Speech client:", error);
}


const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// Configure Gemini API Client
let genAI;
let model;

try {
  const geminiApiKey = functions.config().gemini?.key;
  if (!geminiApiKey) {
    console.warn("Gemini API key not found in Firebase Functions config. LLM functionality will be disabled.");
  } else {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Or other suitable model
    console.log("Gemini API client initialized successfully.");
  }
} catch (error) {
  console.error("Failed to initialize Gemini API client:", error);
}

const GEMINI_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];


/**
 * HTTPS Callable Function to request video translation.
 *
 * Expected data from client:
 * {
 *   videoUrl: string,       // URL of the video in Firebase Storage
 *   sourceLang: string,     // Source language code (e.g., 'en')
 *   targetLang: string,     // Target language code (e.g., 'ko')
 *   userId: string,         // User ID of the requester
 *   videoFileName: string   // Original name of the video file (for tracking)
 *   projectId?: string      // Optional: project ID if videos are grouped
 * }
 */
exports.requestVideoTranslation = functions.https.onCall(async (data, context) => {
  functions.logger.info("Received video translation request:", data);

  // 1. Authentication Check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  // Optional: Check if context.auth.uid matches data.userId if provided by client for consistency
  const userId = context.auth.uid; // Use UID from context for security

  // 2. Validate Input Data
  const { videoUrl, sourceLang, targetLang, videoFileName } = data;
  if (!videoUrl || !sourceLang || !targetLang || !userId || !videoFileName) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required parameters (videoUrl, sourceLang, targetLang, userId, videoFileName)."
    );
  }

  // 3. Create a new job document in Firestore
  let jobId;
  try {
    const jobRef = await db.collection("translationJobs").add({
      userId: userId,
      originalVideoUrl: videoUrl,
      videoFileName: videoFileName,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      status: "queued", // Initial status
      statusDetail: "Awaiting audio extraction",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Add projectId if available: data.projectId
    });
    jobId = jobRef.id;
    functions.logger.info(`Created translation job: ${jobId}`);

    // 4. TODO: Trigger Audio Extraction (e.g., call a Cloud Run service)
    // This will be implemented in a later step. For now, we'll just log it.
    // Example of what might be here:
    // const audioExtractionResponse = await callAudioExtractionService(jobId, videoUrl);
    // await jobRef.update({ status: "extracting_audio", statusDetail: "Audio extraction in progress", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    functions.logger.info(`TODO: Call audio extraction service for job ${jobId} with video URL ${videoUrl}`);

    // For now, simulate that the request to audio extraction service was made
    // In a real scenario, the audio extraction service would update the job status.
    // Here we just update it to indicate it's passed to the (simulated) next step.
    await jobRef.update({
       status: "audio_extraction_pending",
       statusDetail: "Sent request to audio extraction service (simulated)",
       updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });


    return {
      success: true,
      jobId: jobId,
      message: "Video translation job created and queued for audio extraction.",
    };

  } catch (error) {
    functions.logger.error("Error creating translation job:", error);
    if (jobId) { // If job was created but a subsequent step failed
      await db.collection("translationJobs").doc(jobId).update({
        status: "failed",
        statusDetail: `Failed during initial request: ${error.message}`,
        errorMessage: error.message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(updateError => functions.logger.error(`Failed to update job ${jobId} to failed status:`, updateError));
    }
    throw new functions.https.HttpsError(
      "internal",
      `An error occurred while creating the translation job: ${error.message}`
    );
  }
});

// TODO: Later, add Cloud Functions for:
// - STT service call
// - Translation service call
// - TTS service call
// - Lip-sync service call (potentially another Cloud Run service)
// - Final video composition (Cloud Run)
// - Firestore listeners for job status updates to notify client (or client polls)

exports.onNewChatMessage = functions.firestore
  .document("liveChatSessions/{sessionId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const newMessage = snap.data();
    const sessionId = context.params.sessionId;
    const messageId = context.params.messageId; // ID of the new message document

    functions.logger.info(`New message ${messageId} in session ${sessionId}:`, newMessage);

    // 1. Ignore messages sent by AI itself or if content is missing
    if (newMessage.sender !== "ai_assistant_01" && newMessage.content) { // Assuming AI sender ID is 'ai_assistant_01'
      if (!genAI || !model) {
        functions.logger.error("Gemini API client is not initialized. Cannot process message.");
        // Optionally, send an error message back to the chat
        try {
            await db.collection("liveChatSessions").doc(sessionId).collection("messages").add({
                content: "Sorry, I am currently unable to process your request as the AI model is not available.",
                sender: "ai_assistant_01",
                type: "text",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                error: true,
            });
        } catch (dbError) {
            functions.logger.error("Error writing AI error message to Firestore:", dbError);
        }
        return null;
      }

      const userMessageContent = newMessage.content;
      const userId = newMessage.sender; // This is the user's ID

      try {
        functions.logger.info(`Processing message from user ${userId}: "${userMessageContent}"`);

        // (Optional) Fetch recent chat history for context
        const historySnapshot = await db.collection("liveChatSessions").doc(sessionId).collection("messages")
          .where("timestamp", "<", newMessage.timestamp || new Date()) // Messages before current one
          .orderBy("timestamp", "desc")
          .limit(10) // Get last 10 messages for context
          .get();

        const chatHistory = [];
        historySnapshot.docs.reverse().forEach(doc => { // reverse to get chronological order
          const msg = doc.data();
          chatHistory.push({
            role: msg.sender === userId ? "user" : "model", // or 'ai_assistant_01' -> 'model'
            parts: [{ text: msg.content || "" }],
          });
        });
        
        functions.logger.debug("Chat history for context:", JSON.stringify(chatHistory));

        const chat = model.startChat({
            history: chatHistory,
            safetySettings: GEMINI_SAFETY_SETTINGS,
            // generationConfig: { maxOutputTokens: 200 } // Optional
        });

        const result = await chat.sendMessage(userMessageContent);
        // const result = await model.generateContentStream([userMessageContent]); // For streaming
        const response = result.response;
        const aiResponseText = response.text();

        functions.logger.info("AI Response:", aiResponseText);

        // 2. Save AI's response to Firestore
        await db.collection("liveChatSessions").doc(sessionId).collection("messages").add({
          content: aiResponseText || "Sorry, I could not generate a response.",
          sender: "ai_assistant_01", // AI's identifier
          type: "text",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          originalMessageId: messageId, // Reference to the user's message
          userId: userId // Keep track of which user this AI response is for
        });

        functions.logger.info("AI response saved to Firestore.");

        // (Optional) Update session status, e.g., lastInteraction, isAiTyping: false
        await db.collection("liveChatSessions").doc(sessionId).update({
          lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
          // isAiTyping: false // If you implement typing indicators
        });

      } catch (error) {
        functions.logger.error("Error calling Gemini API or processing its response:", error);
        let errorMessage = "Sorry, I encountered an error trying to respond.";
        if (error.response && error.response.promptFeedback) {
            errorMessage += ` (Reason: ${JSON.stringify(error.response.promptFeedback)})`;
        } else if (error.message) {
            errorMessage += ` (${error.message})`;
        }
        
        // Save an error message to Firestore
        try {
          await db.collection("liveChatSessions").doc(sessionId).collection("messages").add({
            content: errorMessage,
            sender: "ai_assistant_01",
            type: "text",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            error: true,
            originalMessageId: messageId,
            userId: userId
          });
        } catch (dbError) {
          functions.logger.error("Error writing AI error message to Firestore:", dbError);
        }
      }
    } else {
      functions.logger.info("Message was sent by AI or has no content, skipping LLM call.");
    }
    return null; // Firestore trigger functions should return a promise or null
  });

exports.requestAvatarVideo = functions.https.onCall(async (data, context) => {
  functions.logger.info("Received avatar video request:", data);

  // 1. Authentication Check
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const userId = context.auth.uid;

  // 2. Validate Input Data
  const { avatarId, script } = data;
  if (!avatarId || !script) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required parameters (avatarId, script).");
  }
  if (script.length > 2000) { // Example length limit
      throw new functions.https.HttpsError("invalid-argument", "Script is too long. Max 2000 characters.");
  }


  // 3. Create a new job document in Firestore
  let jobId;
  const jobRef = db.collection("avatarVideoJobs").doc(); // Auto-generate ID
  jobId = jobRef.id;

  try {
    await jobRef.set({
      userId: userId,
      avatarId: avatarId,
      script: script, // Storing script for record, consider privacy if sensitive
      status: "queued",
      statusDetail: "Job created, awaiting Text-to-Speech processing.",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      progress: 5, // Initial progress
    });
    functions.logger.info(`Created avatar video job: ${jobId}`);

    if (!ttsClient) {
        throw new functions.https.HttpsError("internal", "Text-to-Speech client not available.");
    }

    // 4. Perform Text-to-Speech
    await jobRef.update({ status: "processing_tts", statusDetail: "Generating audio from script...", progress: 10, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    const ttsRequest = {
      input: { text: script },
      // Voice selection can be based on avatarId or user preference
      // Example: Fetch voice config from Firestore based on avatarId
      // const avatarConfig = (await db.collection('avatars').doc(avatarId).get()).data();
      // const voiceParams = avatarConfig.voiceParams || { languageCode: "en-US", name: "en-US-Wavenet-D" };
      voice: { languageCode: "en-US", name: "en-US-Standard-C" }, // Default voice, make this configurable
      audioConfig: { audioEncoding: "MP3" }, // Or LINEAR16 for Wav2Lip if it prefers wav
    };

    const [ttsResponse] = await ttsClient.synthesizeSpeech(ttsRequest);
    const audioContent = ttsResponse.audioContent;
    functions.logger.info(`TTS audio generated for job ${jobId}. Length: ${audioContent.length}`);

    // 5. Save generated audio to Firebase Storage
    // const audioFileName = `${jobId}_${userId}_${avatarId}.mp3`; // Unique name - not needed if using path structure
    const bucket = admin.storage().bucket(); // Default bucket
    // Path: avatarJobs/{jobId}/generated_audio.mp3
    const audioFilePath = `avatarJobs/${jobId}/generated_audio.mp3`;
    const audioFile = bucket.file(audioFilePath);

    await audioFile.save(audioContent, {
      metadata: { contentType: 'audio/mpeg' },
    });
    const [audioUrl] = await audioFile.getSignedUrl({ action: 'read', expires: '03-09-2491' }); // Long-lived URL for internal use

    functions.logger.info(`TTS audio saved to Storage: ${audioFilePath}, URL: ${audioUrl}`);
    await jobRef.update({
      status: "audio_completed",
      statusDetail: "Audio generated and saved. Awaiting lip-sync.",
      generatedAudioUrl: audioUrl, // Store the GCS URI or signed URL
      generatedAudioPath: audioFilePath, // Store path for easier access by other services
      progress: 30,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 6. TODO: Trigger Lip-sync process (e.g., call a Cloud Run service)
    // This will be implemented in a later step.
    functions.logger.info(`TODO: Call lip-sync service for job ${jobId} with audio URL ${audioUrl} and avatar ID ${avatarId}`);
    // For now, simulate that the request to lip-sync service was made
    await jobRef.update({
        status: "lipsync_pending",
        statusDetail: "Sent request to lip-sync service (simulated)",
        progress: 40,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      jobId: jobId,
      message: "Avatar video job created and TTS processing initiated.",
    };

  } catch (error) {
    functions.logger.error(`Error processing avatar video job ${jobId}:`, error);
    await jobRef.update({
      status: "failed",
      statusDetail: `Processing failed: ${error.message}`,
      errorMessage: error.message,
      progress: 0, // Or keep last known progress
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(updateError => functions.logger.error(`Failed to update job ${jobId} to failed status:`, updateError));

    throw new functions.https.HttpsError(
      "internal",
      `An error occurred: ${error.message}`
    );
  }
});
// }); // This closing bracket and parenthesis seems to be a typo in the prompt. Removing it.
