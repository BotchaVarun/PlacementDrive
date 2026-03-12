import { db } from "./lib/firebase-admin";
import "dotenv/config";

async function testConnection() {
    console.log("Testing Firestore connection...");
    console.log("FIREBASE_SERVICE_ACCOUNT present:", !!process.env.FIREBASE_SERVICE_ACCOUNT);
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.log("FIREBASE_SERVICE_ACCOUNT length:", process.env.FIREBASE_SERVICE_ACCOUNT.length);
        try {
            const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            console.log("Service Account Project ID:", sa.project_id);
            console.log("Service Account Client Email:", sa.client_email);
        } catch (e) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON");
        }
    }
    try {
        const collections = await db.listCollections();
        console.log("Successfully connected to Firestore.");
        console.log("Collections:", collections.map(c => c.id));
    } catch (error: any) {
        console.error("Firestore connection failed:");
        console.error("Code:", error.code);
        console.error("Details:", error.details);
        console.error("Message:", error.message);
    }
}

testConnection();
