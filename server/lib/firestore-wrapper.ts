import { db } from "./firebase-admin.js";
import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";

export { db };
export const Timestamp = AdminTimestamp;

export function collection(dbInstance: any, path: string) {
    return dbInstance.collection(path);
}

export function doc(dbInstance: any, path: string, id?: string) {
    if (id) {
        return dbInstance.collection(path).doc(id);
    } else {
        return dbInstance.doc(path);
    }
}

export async function getDoc(ref: any) {
    const snap = await ref.get();
    return {
        id: snap.id,
        exists: () => snap.exists,
        data: () => snap.data()
    };
}

export async function getDocs(query: any) {
    const snap = await query.get();
    return {
        empty: snap.empty,
        docs: snap.docs.map((doc: any) => ({
            id: doc.id,
            exists: () => doc.exists,
            data: () => doc.data()
        }))
    };
}

export async function addDoc(col: any, data: any) {
    return await col.add(data);
}

export async function setDoc(ref: any, data: any) {
    await ref.set(data);
}

export async function updateDoc(ref: any, data: any) {
    await ref.update(data);
}

export async function deleteDoc(ref: any) {
    await ref.delete();
}

export function query(col: any, ...constraints: any[]) {
    let q = col;
    for (const c of constraints) {
        q = c(q);
    }
    return q;
}

export function where(field: string, op: any, val: any) {
    return (q: any) => q.where(field, op, val);
}

export function orderBy(field: string, dir?: any) {
    return (q: any) => q.orderBy(field, dir);
}

export function limit(n: number) {
    return (q: any) => q.limit(n);
}

export async function getCountFromServer(q: any) {
    const snap = await q.count().get();
    return { data: () => ({ count: snap.data().count }) };
}

export const Bytes = {
    fromBase64String: (b64: string) => Buffer.from(b64, "base64")
};
