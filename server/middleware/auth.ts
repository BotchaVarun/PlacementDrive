import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/firebase-admin.js";
import { storage } from "../storage.js";

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: any; // We'll attach the user object here
        }
    }
}

export const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: Missing or invalid token" });
    }

    const token = authHeader.split("Bearer ")[1];

    try {
        // 1. Verify the ID token
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        // 2. Find or Create User in our Database
        // We ideally should have the user synced already, but let's be safe.
        let user = await storage.getUserByFirebaseUid(uid);

        if (!user) {
            // If user doesn't exist in our DB yet (e.g. first login), verify against firebase 
            // and create them. Or strictly require sync. 
            // For robustness, let's try to fetch email from token and sync.
            user = await storage.createUser({
                firebaseUid: uid,
                email: decodedToken.email || "",
                name: decodedToken.name || undefined
            });
        }

        // 3. Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error("Auth Error:", error);
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
};
