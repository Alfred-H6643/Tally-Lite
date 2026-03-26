import type { VercelRequest, VercelResponse } from '@vercel/node';
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

  // 年份參數處理，預設取台北時區的當前年份
  const nowTaipei = new Date(new Date().toLocaleString('en-CA', { timeZone: 'Asia/Taipei' }));
  const yearParam = req.query.year as string | undefined;
  const year = yearParam ? parseInt(yearParam, 10) : nowTaipei.getFullYear();

  try {
    // 平行抓取 budgets、categories、subcategories
    const [budgetSnap, catSnap, subSnap] = await Promise.all([
      adminDb.collection(`users/${userId}/budgets`).where('year', '==', year).get(),
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

    // 清洗資料並加總
    let totalYearlyBudget = 0;

    const data = budgetSnap.docs.map(doc => {
      const d = doc.data();
      const amount = d.amount ?? 0;
      totalYearlyBudget += amount;

      const item: Record<string, unknown> = {
        year: d.year,
        amount,
        category: categoryMap[d.categoryId] ?? d.categoryId ?? '',
        subcategory: subcategoryMap[d.subcategoryId] ?? d.subcategoryId ?? '',
      };

      if (Array.isArray(d.monthlyAmounts)) {
        item.monthlyAmounts = d.monthlyAmounts;
      }

      return item;
    });

    return res.status(200).json({
      summary: {
        year,
        totalYearlyBudget,
        budgetCount: data.length,
      },
      data,
    });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
