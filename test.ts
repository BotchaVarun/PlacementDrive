import { storage } from "./server/storage.js";

async function run() {
    try {
        console.log("Fetching mock user uid...");
        const user = await storage.getUserByFirebaseUid("non-existent-uid");
        console.log("User:", user);
    } catch (err) {
        console.error("Storage error:", err);
    }
}
run();
