import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '../_utils/firebaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允許 GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 安全驗證
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.AI_AGENT_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = process.env.AGENT_TARGET_USER_UID;
  if (!userId) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  // 日期參數處理，預設當月 1 號至今
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const startDateStr = (req.query.startDate as string) ?? formatDate(defaultStart);
  const endDateStr = (req.query.endDate as string) ?? formatDate(now);

  const startTimestamp = Timestamp.fromDate(new Date(`${startDateStr}T00:00:00`));
  const endTimestamp = Timestamp.fromDate(new Date(`${endDateStr}T23:59:59`));

  try {
    // 平行抓取 transactions、categories、subcategories
    const [txSnap, catSnap, subSnap] = await Promise.all([
      adminDb
        .collection(`users/${userId}/transactions`)
        .where('date', '>=', startTimestamp)
        .where('date', '<=', endTimestamp)
        .orderBy('date', 'desc')
        .get(),
      adminDb.collection(`users/${userId}/categories`).get(),
      adminDb.collection(`users/${userId}/subcategories`).get(),
    ]);

    // 建立 id → name 的對應表
    const categoryMap: Record<string, string> = {};
    catSnap.forEach(doc => {
      categoryMap[doc.id] = doc.data().name ?? doc.id;
    });

    const subcategoryMap: Record<string, string> = {};
    subSnap.forEach(doc => {
      subcategoryMap[doc.id] = doc.data().name ?? doc.id;
    });

    // 清洗資料
    let totalExpense = 0;
    let totalIncome = 0;

    const data = txSnap.docs.map(doc => {
      const d = doc.data();
      const amount = d.amount ?? 0;

      if (d.type === 'expense') totalExpense += amount;
      if (d.type === 'income') totalIncome += amount;

      return {
        date: d.date instanceof Timestamp ? formatDate(d.date.toDate()) : d.date,
        type: d.type,
        amount,
        category: categoryMap[d.categoryId] ?? d.categoryId ?? '',
        subcategory: subcategoryMap[d.subcategoryId] ?? d.subcategoryId ?? '',
        note: d.note ?? '',
      };
    });

    return res.status(200).json({
      summary: {
        period: `${startDateStr} to ${endDateStr}`,
        totalExpense,
        totalIncome,
        transactionCount: data.length,
      },
      data,
    });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
