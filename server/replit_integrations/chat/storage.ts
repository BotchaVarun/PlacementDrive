import { db } from "../../lib/firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from "firebase/firestore";
import { conversations, messages, Conversation, Message } from "../../../shared/schema.js";

export interface IChatStorage {
  getConversation(id: string): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(conversationId: string, role: string, content: string): Promise<Message>;
}

// Helper functions
function convertDate(data: any): any {
  if (!data) return data;
  const newData = { ...data };
  if (newData.createdAt && newData.createdAt instanceof Timestamp) {
    newData.createdAt = newData.createdAt.toDate();
  }
  return newData;
}

async function safeGetDocs(q: any, fallbackCollection: any) {
  try {
    return await getDocs(q);
  } catch (error: any) {
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      console.warn(`[Firestore Chat] Index missing for ${fallbackCollection.path}. Attempting in-memory recovery.`);
      try {
        return await getDocs(query(fallbackCollection, limit(5000)));
      } catch (fallbackError) {
        console.error(`[Firestore Chat] Critical failure in fallback for ${fallbackCollection.path}:`, fallbackError);
        throw fallbackError;
      }
    }
    console.error(`[Firestore Chat] unexpected error fetching ${fallbackCollection.path}:`, error);
    throw error;
  }
}

export const chatStorage: IChatStorage = {
  async getConversation(id: string): Promise<Conversation | undefined> {
    const docRef = doc(db, "conversations", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return { id: docSnap.id, ...convertDate(docSnap.data()) } as Conversation;
  },

  async getAllConversations(): Promise<Conversation[]> {
    const conversationsRef = collection(db, "conversations");
    // const q = query(conversationsRef, orderBy("createdAt", "desc"));
    const q = query(conversationsRef);
    const querySnapshot = await safeGetDocs(q, conversationsRef);
    const convs = querySnapshot.docs.map(doc => ({ id: doc.id, ...convertDate(doc.data()) } as Conversation));
    convs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    return convs;
  },

  async createConversation(title: string): Promise<Conversation> {
    const conversationsRef = collection(db, "conversations");
    const now = new Date();
    const docRef = await addDoc(conversationsRef, { title, createdAt: now });
    return { id: docRef.id, title, createdAt: now } as Conversation;
  },

  async deleteConversation(id: string): Promise<void> {
    // First delete messages
    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, where("conversationId", "==", id));
    const querySnapshot = await safeGetDocs(q, messagesRef);
    const deletePromises = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...(doc.data() as any) } as Message))
      .filter(m => m.conversationId === id)
      .map(m => deleteDoc(doc(db, "messages", m.id!)));
    await Promise.all(deletePromises);

    // Then delete conversation
    await deleteDoc(doc(db, "conversations", id));
  },

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, where("conversationId", "==", conversationId));
    const querySnapshot = await safeGetDocs(q, messagesRef);
    const msgs = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...convertDate(doc.data()) } as Message))
      .filter(m => m.conversationId === conversationId); // Manual filter for fallback
    msgs.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
    return msgs;
  },

  async createMessage(conversationId: string, role: string, content: string): Promise<Message> {
    const messagesRef = collection(db, "messages");
    const now = new Date();
    const docRef = await addDoc(messagesRef, { conversationId, role, content, createdAt: now });
    return { id: docRef.id, conversationId, role, content, createdAt: now } as Message;
  },
};
