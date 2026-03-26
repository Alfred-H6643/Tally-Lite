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

  // 解析 year / month 參數，預設取台北時區的當前年月
  const nowTaipei = new Date(new Date().toLocaleString('en-CA', { timeZone: 'Asia/Taipei' }));
  const monthParam = req.query.month as string | undefined;
  const yearParam = req.query.year as string | undefined;

  let year: number;
  let monthIndex: number; // 0-11

  if (monthParam) {
    // month 優先：格式 YYYY-MM，從中解析 year 與 monthIndex
    const [y, m] = monthParam.split('-').map(Number);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM (e.g. 2026-03).' });
    }
    year = y;
    monthIndex = m - 1;
  } else {
    const parsedYear = yearParam ? parseInt(yearParam, 10) : NaN;
    year = !yearParam || isNaN(parsedYear) ? nowTaipei.getFullYear() : parsedYear;
    monthIndex = nowTaipei.getMonth();
  }

  const monthLabel = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

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

    // 清洗資料並統計
    let totalYearlyBudget = 0;
    let totalMonthlyBudget = 0;
    const byCategory: Record<string, number> = {};

    const data = budgetSnap.docs.map(doc => {
      const d = doc.data();
      const amount = d.amount ?? 0;
      totalYearlyBudget += amount;

      // 計算當月預算
      const hasMonthlyAmounts = Array.isArray(d.monthlyAmounts) && d.monthlyAmounts.length === 12;
      const rawMonthly = hasMonthlyAmounts ? d.monthlyAmounts[monthIndex] : null;
      const monthlyBudget = typeof rawMonthly === 'number' && !isNaN(rawMonthly)
        ? rawMonthly
        : Math.round(amount / 12);

      totalMonthlyBudget += monthlyBudget;

      const category = categoryMap[d.categoryId] ?? d.categoryId ?? '';
      const subcategory = subcategoryMap[d.subcategoryId] ?? d.subcategoryId ?? '';

      byCategory[category] = (byCategory[category] ?? 0) + monthlyBudget;

      const item: Record<string, unknown> = {
        year: d.year,
        amount,
        monthlyBudget,
        category,
        subcategory,
      };

      if (hasMonthlyAmounts) {
        item.monthlyAmounts = d.monthlyAmounts;
      }

      return item;
    });

    return res.status(200).json({
      summary: {
        year,
        month: monthLabel,
        totalYearlyBudget,
        monthlyBudget: totalMonthlyBudget,
        budgetCount: data.length,
        byCategory,
      },
      data,
    });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
