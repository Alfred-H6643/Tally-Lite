import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config(); // 載入 .env

// 讀取 Service Account Key
const serviceAccount = JSON.parse(
    readFileSync('./serviceAccountKey.json', 'utf8')
);

// 初始化 Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 用戶 ID 從環境變數讀取
const PROD_USER_ID = process.env.PROD_USER_ID;
const DEV_USER_ID = process.env.DEV_USER_ID;

if (!PROD_USER_ID || !DEV_USER_ID) {
    console.error('❌ 請在 scripts/.env 中設定 PROD_USER_ID 和 DEV_USER_ID');
    process.exit(1);
}

/**
 * 設定用戶角色
 */
async function setUserRole(userId, role, displayName) {
    try {
        const profileRef = db.doc(`users/${userId}/config/profile`);
        const profileDoc = await profileRef.get();

        if (profileDoc.exists) {
            // 更新現有 profile
            await profileRef.update({ role });
            console.log(`✅ 已更新 ${displayName} (${userId}) 的角色為: ${role}`);
        } else {
            // 創建新的 profile
            await profileRef.set({
                displayName: displayName,
                avatar: '👤',
                role: role
            });
            console.log(`✅ 已創建 ${displayName} (${userId}) 的 profile，角色為: ${role}`);
        }
    } catch (error) {
        console.error(`❌ 設定角色失敗 (${userId}):`, error);
    }
}

/**
 * 主函數
 */
async function main() {
    console.log('🔧 開始設定用戶角色...\n');

    // 設定正式帳號為普通用戶
    await setUserRole(PROD_USER_ID, 'user', '正式帳號');

    // 設定開發帳號為管理員
    await setUserRole(DEV_USER_ID, 'admin', '開發帳號');

    console.log('\n✅ 角色設定完成！');
    process.exit(0);
}

// 執行
main().catch((error) => {
    console.error('❌ 錯誤:', error);
    process.exit(1);
});
