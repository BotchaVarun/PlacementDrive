import admin from "firebase-admin";
import "dotenv/config";

// Initialize Firebase Admin
// Ideally, you should use service account credentials here.
// For now, we'll try to use the default application credentials or a mock if in development without keys.

if (!admin.apps.length) {
    try {
        console.log("Initializing Firebase Admin...");
        let credential;

        // 1. Try to load Service Account from Env Var
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.log("Attempting to initialize with FIREBASE_SERVICE_ACCOUNT...");
            try {
                const saJson = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
                const serviceAccount = JSON.parse(saJson);
                
                // Fix for private key newlines and whitespace
                if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
                    serviceAccount.private_key = serviceAccount.private_key
                        .replace(/\\n/g, '\n')
                        .trim();
                }
                
                credential = admin.credential.cert(serviceAccount);
                console.log(`Successfully configured certificate for project: ${serviceAccount.project_id}`);
            } catch (e: any) {
                console.error("Failed to parse or apply FIREBASE_SERVICE_ACCOUNT JSON:", e.message);
            }
        }

        // 2. Fallback to Application Default Credentials
        if (!credential) {
            console.log("No valid service account found in environment, falling back to Application Default Credentials...");
            try {
                credential = admin.credential.applicationDefault();
            } catch (e: any) {
                console.warn("Application Default Credentials not available:", e.message);
            }
        }

        if (!credential) {
            throw new Error("No valid Firebase credentials found. Please check FIREBASE_SERVICE_ACCOUNT in your .env file.");
        }

        admin.initializeApp({
            credential,
            projectId: "placementprime-a9713"
        });

        console.log("Firebase Admin initialized successfully.");
    } catch (error: any) {
        console.error("Critical error: Failed to initialize Firebase Admin:", error.message);
    }
}

export const auth = admin.auth();
export const db = admin.firestore();
