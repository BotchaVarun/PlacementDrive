import admin from "firebase-admin";

// Initialize Firebase Admin
// Ideally, you should use service account credentials here.
// For now, we'll try to use the default application credentials or a mock if in development without keys.

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(), // Expects GOOGLE_APPLICATION_CREDENTIALS env var
            // OR use serviceAccount if you have the file:
            // credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize Firebase Admin:", error);
        // Fallback for local dev without creds? 
        // Usually we want to fail fast, but for this specific user request context 
        // where they might not have the key yet, we might need a placeholder or just log it.
    }
}

export const auth = admin.auth();
export const db = admin.firestore();
