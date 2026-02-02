import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// 讀取 Service Account Key
const serviceAccount = JSON.parse(
    readFileSync('./serviceAccountKey.json', 'utf8')
);

// 初始化 Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 用戶 ID 設定
const PROD_USER_ID = 'ftqQxIbyX6WRhLDhywYmwJ0yKw12'; // alfred.mc.hsu@gmail.com
const DEV_USER_ID = '9HqyWH9f0dSwKAR5yIBUBfx4GFM2';  // 開發帳號

// 日期範圍設定
const START_DATE = new Date('2024-11-01T00:00:00+08:00');
const END_DATE = new Date('2025-01-31T23:59:59+08:00');

/**
 * 複製單個集合
 */
async function copyCollection(fromUserId, toUserId, collectionName) {
    try {
        console.log(`📋 正在複製 ${collectionName}...`);

        const snapshot = await db
            .collection(`users/${fromUserId}/${collectionName}`)
            .get();

        if (snapshot.empty) {
            console.log(`   ⚠️  ${collectionName} 是空的，跳過`);
            return 0;
        }

        const batch = db.batch();
        let count = 0;

        snapshot.docs.forEach(doc => {
            const newDocRef = db.doc(`users/${toUserId}/${collectionName}/${doc.id}`);
            batch.set(newDocRef, doc.data());
            count++;
        });

        await batch.commit();
        console.log(`   ✅ 已複製 ${count} 筆 ${collectionName}`);
        return count;
    } catch (error) {
        console.error(`   ❌ 複製 ${collectionName} 失敗:`, error);
        return 0;
    }
}

/**
 * 複製指定日期範圍的交易記錄
 */
async function copyTransactions(fromUserId, toUserId, startDate, endDate) {
    try {
        console.log(`📋 正在複製交易記錄 (${startDate.toLocaleDateString('zh-TW')} ~ ${endDate.toLocaleDateString('zh-TW')})...`);

        const snapshot = await db
            .collection(`users/${fromUserId}/transactions`)
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get();

        if (snapshot.empty) {
            console.log(`   ⚠️  指定日期範圍內沒有交易記錄`);
            return 0;
        }

        // Firestore batch 限制每次 500 筆，我們用 400 保守一點
        const BATCH_SIZE = 400;
        let count = 0;
        let batch = db.batch();
        let batchCount = 0;

        for (const doc of snapshot.docs) {
            const newDocRef = db.doc(`users/${toUserId}/transactions/${doc.id}`);
            batch.set(newDocRef, doc.data());
            count++;
            batchCount++;

            // 如果達到批次大小，提交並開始新批次
            if (batchCount >= BATCH_SIZE) {
                await batch.commit();
                console.log(`   ⏳ 已處理 ${count} 筆...`);
                batch = db.batch();
                batchCount = 0;
            }
        }

        // 提交最後一個批次
        if (batchCount > 0) {
            await batch.commit();
        }

        console.log(`   ✅ 已複製 ${count} 筆交易記錄`);
        return count;
    } catch (error) {
        console.error(`   ❌ 複製交易記錄失敗:`, error);
        return 0;
    }
}

/**
 * 複製個人設定（並設定為開發帳號）
 */
async function copyProfile(fromUserId, toUserId) {
    try {
        console.log(`📋 正在複製個人設定...`);

        const profileDoc = await db.doc(`users/${fromUserId}/config/profile`).get();

        if (profileDoc.exists) {
            const profileData = profileDoc.data();
            await db.doc(`users/${toUserId}/config/profile`).set({
                ...profileData,
                displayName: '開發帳號',
                role: 'admin' // 設定為管理員
            });
            console.log(`   ✅ 已複製個人設定並設為管理員`);
        } else {
            // 如果沒有 profile，創建一個預設的
            await db.doc(`users/${toUserId}/config/profile`).set({
                displayName: '開發帳號',
                avatar: '👤',
                role: 'admin'
            });
            console.log(`   ✅ 已創建預設個人設定（管理員）`);
        }
    } catch (error) {
        console.error(`   ❌ 複製個人設定失敗:`, error);
    }
}

/**
 * 主函數
 */
async function main() {
    console.log('🚀 開始複製資料...\n');
    console.log(`從: ${PROD_USER_ID} (正式帳號)`);
    console.log(`到: ${DEV_USER_ID} (開發帳號)`);
    console.log(`日期範圍: ${START_DATE.toLocaleDateString('zh-TW')} ~ ${END_DATE.toLocaleDateString('zh-TW')}\n`);

    const stats = {
        categories: 0,
        subcategories: 0,
        projectTags: 0,
        budgets: 0,
        transactions: 0
    };

    // 複製各個集合
    stats.categories = await copyCollection(PROD_USER_ID, DEV_USER_ID, 'categories');
    stats.subcategories = await copyCollection(PROD_USER_ID, DEV_USER_ID, 'subcategories');
    stats.projectTags = await copyCollection(PROD_USER_ID, DEV_USER_ID, 'projectTags');
    stats.budgets = await copyCollection(PROD_USER_ID, DEV_USER_ID, 'budgets');

    // 複製交易記錄（指定日期範圍）
    stats.transactions = await copyTransactions(PROD_USER_ID, DEV_USER_ID, START_DATE, END_DATE);

    // 複製個人設定
    await copyProfile(PROD_USER_ID, DEV_USER_ID);

    console.log('\n📊 複製統計：');
    console.log(`   分類: ${stats.categories} 筆`);
    console.log(`   子分類: ${stats.subcategories} 筆`);
    console.log(`   專案標籤: ${stats.projectTags} 筆`);
    console.log(`   預算: ${stats.budgets} 筆`);
    console.log(`   交易記錄: ${stats.transactions} 筆`);
    console.log('\n✅ 資料複製完成！');

    process.exit(0);
}

// 執行
main().catch((error) => {
    console.error('❌ 錯誤:', error);
    process.exit(1);
});
