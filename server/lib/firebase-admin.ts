import admin from "firebase-admin";
import "dotenv/config";
import crypto from "crypto";

// Initialize Firebase Admin
// Ideally, you should use service account credentials here.
// For now, we'll try to use the default application credentials or a mock if in development without keys.

async function initializeFirebase() {
    try {
        // If apps already exist, we clear them to ensure our credentials take effect
        if (admin.apps.length > 0) {
            console.log(`Cleaning up ${admin.apps.length} existing Firebase apps...`);
            for (const app of admin.apps) {
                if (app) await app.delete();
            }
        }

        console.log("Initializing Firebase Admin with explicit credentials...");
        let credential;

        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
                const saJson = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
                const serviceAccount = JSON.parse(saJson);
                
                if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
                    serviceAccount.private_key = serviceAccount.private_key
                        .replace(/\\n/g, '\n')
                        .trim();
                    
                    const hash = crypto.createHash('sha256').update(serviceAccount.private_key).digest('hex');
                    console.log(`Private Key Hash (SHA-256): ${hash.substring(0, 16)}...`);
                    console.log(`Private Key ID: ${serviceAccount.private_key_id}`);
                }
                
                credential = admin.credential.cert(serviceAccount);
                console.log(`Credential certificate created for: ${serviceAccount.client_email}`);
            } catch (e: any) {
                console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", e.message);
            }
        }

        if (!credential) {
            console.log("Falling back to Application Default Credentials...");
            credential = admin.credential.applicationDefault();
        }

        admin.initializeApp({
            credential,
            projectId: "placementprime-a9713"
        });

        console.log("Firebase Admin [DEFAULT] app initialized successfully.");
    } catch (error: any) {
        console.error("CRITICAL: Firebase Admin initialization failed:", error.message);
    }
}

// Execute initialization and export
// Note: Some modules might import auth/db before this completes if not careful.
// In ESM, top-level await is generally supported for dependencies.
await initializeFirebase();

export const auth = admin.auth();
export const db = admin.firestore();
