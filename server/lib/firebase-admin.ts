import admin from "firebase-admin";

// Initialize Firebase Admin
// Ideally, you should use service account credentials here.
// For now, we'll try to use the default application credentials or a mock if in development without keys.

if (!admin.apps.length) {
    try {
        let credential;

        // 1. Try to load Service Account from Env Var (Best for Vercel)
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                credential = admin.credential.cert(serviceAccount);
            } catch (e) {
                console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", e);
            }
        }

        // 2. Fallback to Application Default Credentials
        if (!credential) {
            credential = admin.credential.applicationDefault();
        }

        admin.initializeApp({
            credential,
            projectId: "placementprime-a9713" // Explicit Project ID prevents "Unable to detect Project Id" error
        });

        console.log("Firebase Admin initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize Firebase Admin:", error);
    }
}

export const auth = admin.auth();
export const db = admin.firestore();
