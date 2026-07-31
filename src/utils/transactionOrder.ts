import { startOfDay } from 'date-fns';
import type { Transaction } from '../types';

/**
 * Sort key for intra-day ordering.
 *
 * `date` is stored at local midnight, so it carries no time-of-day information —
 * `createdAt` is the only field that distinguishes transactions recorded on the
 * same day. Without it, Firestore falls back to its random auto-generated doc IDs.
 *
 * A pending write has a null `serverTimestamp` until the server acks it; treat it
 * as newest so a just-added transaction stays put instead of jumping.
 */
export const createdAtOrder = (t: Pick<Transaction, 'createdAt'>): number => {
    const ts = t.createdAt ? new Date(t.createdAt).getTime() : NaN;
    return Number.isNaN(ts) ? Infinity : ts;
};

/**
 * Newest first: by calendar day, then by creation time within that day.
 *
 * The day is compared via `startOfDay` rather than the raw timestamp because the
 * two write paths disagree on time-of-day — `AddTransaction` stores local midnight
 * while CSV import stores UTC midnight (08:00 local at UTC+8). Normalizing to the
 * calendar day keeps imported and manually entered transactions interleaved by
 * creation time instead of splitting them into two blocks.
 */
export const compareTransactionsDesc = (a: Transaction, b: Transaction): number => {
    const dayDiff = startOfDay(new Date(b.date)).getTime() - startOfDay(new Date(a.date)).getTime();
    if (dayDiff !== 0) return dayDiff;
    return createdAtOrder(b) - createdAtOrder(a);
};
