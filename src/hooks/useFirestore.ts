import { useState, useEffect } from 'react';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    serverTimestamp,
    QueryConstraint
} from 'firebase/firestore';
import { db } from '../services/firebase';

const EMPTY_CONSTRAINTS: QueryConstraint[] = [];

export const useFirestoreCollection = <T extends { id: string }>(
    collectionPath: string,
    constraints: QueryConstraint[] = EMPTY_CONSTRAINTS
) => {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        // If collection path is empty/invalid, don't try to fetch
        if (!collectionPath) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, collectionPath), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const items = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // Convert Firestore Timestamps to Dates if needed
                    // For now, we assume calling code handles types, or we can add a converter here
                    // Ideally, we treat timestamps as Dates in the app
                    return {
                        id: doc.id,
                        ...data,
                        // Helper to convert typical timestamp fields if they exist
                        ...(data.createdAt?.toDate && { createdAt: data.createdAt.toDate() }),
                        ...(data.updatedAt?.toDate && { updatedAt: data.updatedAt.toDate() }),
                        ...(data.date?.toDate && { date: data.date.toDate() })
                    };
                }) as T[];

                // Sort items? Or rely on query constraints. 
                // Let's rely on Firestore query constraints for sorting if provided, 
                // but for stability locally we might want default sort.
                // For now, raw data.
                setData(items);
                setLoading(false);
            },
            (err) => {
                console.error(`Error fetching collection ${collectionPath}:`, err);
                setError(err);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, [collectionPath, constraints]); // Re-run if path or constraints change

    // CRUD Helper functions
    const add = async (item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
        const colRef = collection(db, collectionPath);
        return addDoc(colRef, {
            ...item,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    };

    const update = async (id: string, updates: Partial<T>) => {
        const docRef = doc(db, collectionPath, id);
        // Exclude id from updates to avoid overwriting it (though Firestore ignores it usually)
        const { id: _, ...dataToUpdate } = updates as any;
        return updateDoc(docRef, {
            ...dataToUpdate,
            updatedAt: serverTimestamp()
        });
    };

    const remove = async (id: string) => {
        const docRef = doc(db, collectionPath, id);
        return deleteDoc(docRef);
    };

    // Set (Upsert) - useful for things with specific IDs like categories
    const set = async (id: string, item: Partial<T>) => {
        const docRef = doc(db, collectionPath, id);
        return setDoc(docRef, {
            ...item,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
    }

    return { data, loading, error, add, update, remove, set };
};
