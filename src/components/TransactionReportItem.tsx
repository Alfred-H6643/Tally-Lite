import React from 'react';
import { format } from 'date-fns';
import { convertAmountToTWD, formatAmount } from '../utils/currency';
import type { ProjectTag, Transaction } from '../types';

export interface TransactionReportItemProps {
    transaction: Transaction;
    projectTags: ProjectTag[];
    onEditClick: (t: Transaction) => void;
    /** When provided, replaces the default note line with this single line (caller composes it, e.g. "分類 › 子分類 › note"). */
    subtitle?: string;
}

export const TransactionReportItem = React.memo(({ transaction, projectTags, onEditClick, subtitle }: TransactionReportItemProps) => {
    const handleEdit = React.useCallback(() => {
        onEditClick(transaction);
    }, [onEditClick, transaction]);

    return (
        <div
            onClick={handleEdit}
            className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs cursor-pointer active:bg-gray-100 transition-colors"
        >
            <div className="flex-1 min-w-0">
                <div className="text-gray-600 flex items-center gap-2">
                    {format(new Date(transaction.date), 'yyyy/MM/dd')}
                    {transaction.tags && transaction.tags.length > 0 && (() => {
                        const tagId = transaction.tags[0];
                        // Using tagId with any map or array lookup
                        const tag = projectTags.find(p => p.id === tagId);
                        return tag ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-600 text-[10px] font-medium border border-blue-200">
                                <span>🏷️</span>
                                {tag.name}
                            </span>
                        ) : null;
                    })()}
                </div>
                {subtitle ? (
                    <div className="text-gray-500 truncate">{subtitle}</div>
                ) : (
                    transaction.note && (
                        <div className="text-gray-400 truncate">{transaction.note}</div>
                    )
                )}
            </div>
            <div className="text-right ml-2">
                {formatAmount(transaction.amount, transaction.currency)}
                {transaction.currency && transaction.currency !== 'TWD' && (
                    <div className="text-[10px] text-gray-400">
                        ≈ ${convertAmountToTWD(transaction.amount, transaction.currency).toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    );
});
