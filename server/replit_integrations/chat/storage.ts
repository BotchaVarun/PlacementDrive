import { db } from "../../lib/firebase";
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
import { conversations, messages, Conversation, Message } from "@shared/schema";

export interface IChatStorage {
  getConversation(id: string): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(conversationId: string, role: string, content: string): Promise<Message>;
}

// Helper function
function convertDate(data: any): any {
  if (!data) return data;
  const newData = { ...data };
  if (newData.createdAt && newData.createdAt instanceof Timestamp) {
    newData.createdAt = newData.createdAt.toDate();
  }
  return newData;
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
    const q = query(conversationsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...convertDate(doc.data()) } as Conversation));
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
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Then delete conversation
    await deleteDoc(doc(db, "conversations", id));
  },

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, where("conversationId", "==", conversationId), orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...convertDate(doc.data()) } as Message));
  },

  async createMessage(conversationId: string, role: string, content: string): Promise<Message> {
    const messagesRef = collection(db, "messages");
    const now = new Date();
    const docRef = await addDoc(messagesRef, { conversationId, role, content, createdAt: now });
    return { id: docRef.id, conversationId, role, content, createdAt: now } as Message;
  },
};
