import { db } from '../services/firebase';
import { doc, serverTimestamp, writeBatch, getDocs, collection } from 'firebase/firestore';
import { initializeDefaultData } from './defaultCategories';
import type { Category, Subcategory, Transaction, Budget, ProjectTag } from '../types';

/**
 * Initializes Firestore with default categories and subcategories for a new user.
 * This is the "fast way" to set up the database structure.
 */
export const initializeFirestoreData = async (userId: string) => {
    try {
        console.log('Starting data initialization for user:', userId);

        // Safety Check: Ensure no categories exist before initializing
        const categoriesRef = collection(db, `users/${userId}/categories`);
        const snapshot = await getDocs(categoriesRef);

        if (!snapshot.empty) {
            console.warn('Data initialization skipped: Categories already exist.');
            return { success: false, message: 'Categories already exist' };
        }

        const { categories, allSubcategories } = initializeDefaultData();
        const batch = writeBatch(db);

        // Add Categories
        categories.forEach((category) => {
            const ref = doc(db, `users/${userId}/categories`, category.id);
            batch.set(ref, {
                ...category,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        });

        // Add Subcategories
        allSubcategories.forEach((subcategory) => {
            const ref = doc(db, `users/${userId}/subcategories`, subcategory.id);
            batch.set(ref, {
                ...subcategory,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        });

        await batch.commit();
        console.log('Successfully initialized default data!');
        return { success: true, count: categories.length + allSubcategories.length };
    } catch (error) {
        console.error('Error initializing data:', error);
        throw error;
    }
};

/**
 * Migrates existing data from localStorage to Firestore.
 * Useful if the user has been using the app locally.
 */
export const migrateLocalStorageToFirebase = async (userId: string) => {
    try {
        console.log('Starting migration from localStorage for user:', userId);
        const batch = writeBatch(db);
        let operationCount = 0;

        // Helper to migrate a collection
        const migrateCollection = <T extends { id: string }>(
            key: string,
            collectionName: string
        ) => {
            const localData = localStorage.getItem(key);
            if (localData) {
                const items = JSON.parse(localData) as T[];
                items.forEach((item) => {
                    const ref = doc(db, `users/${userId}/${collectionName}`, item.id);
                    batch.set(ref, {
                        ...item,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    operationCount++;
                });
            }
        };

        // Migrate all collections
        migrateCollection<Category>('categories', 'categories');
        migrateCollection<Subcategory>('subcategories', 'subcategories');
        migrateCollection<Transaction>('transactions', 'transactions');
        migrateCollection<Budget>('budgets', 'budgets');
        migrateCollection<ProjectTag>('projectTags', 'projectTags');

        if (operationCount > 0) {
            await batch.commit();
            console.log(`Successfully migrated ${operationCount} items to Firestore!`);
        } else {
            console.log('No local data found to migrate.');
        }

        return { success: true, count: operationCount };
    } catch (error) {
        console.error('Error migrating data:', error);
        throw error;
    }
};
