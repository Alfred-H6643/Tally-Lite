import React, { useRef, useState } from 'react';
import { format, getDaysInMonth, isSameMonth } from 'date-fns';

const SLOT_COUNT = 30;
const SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => SLOT_COUNT - i);

interface DateScrubberProps {
    month: Date;
    /** 有交易的日期（yyyy-MM-dd），這些日子顯示較深的灰色 */
    datesWithRecords: Set<string>;
    onSelect: (dateStr: string) => void;
}

/**
 * 首頁左側的日期索引條，操作方式同 iOS 設定的字母索引：點一下或按住上下滑，
 * 清單就跟著跳到該日。上下順序與清單相同（新的日期在上），手指方向才會和捲動一致。
 *
 * 用途是快速跳到大概的位置，所以每個月固定 30 格：第 30 格一律代表該月最後一天，
 * 其餘格子就是同號日期（2 月的第 29 格也落在最後一天）。
 */
const DateScrubber: React.FC<DateScrubberProps> = ({ month, datesWithRecords, onSelect }) => {
    const [activeSlot, setActiveSlot] = useState<number | null>(null);
    const lastSlot = useRef<number | null>(null);

    const lastDay = getDaysInMonth(month);
    const slotToDay = (slot: number) => (slot === SLOT_COUNT ? lastDay : Math.min(slot, lastDay));
    const toDateStr = (day: number) => format(new Date(month.getFullYear(), month.getMonth(), day), 'yyyy-MM-dd');

    // 31 天的月份，第 30 格同時涵蓋 30、31 號
    const slotHasRecords = (slot: number) => {
        const firstDay = Math.min(slot, lastDay);
        for (let day = firstDay; day <= slotToDay(slot); day++) {
            if (datesWithRecords.has(toDateStr(day))) return true;
        }
        return false;
    };

    const today = new Date();
    const todaySlot = isSameMonth(month, today) ? Math.min(today.getDate(), SLOT_COUNT) : null;

    const selectAtPointer = (e: React.PointerEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientY - rect.top) / rect.height;
        const index = Math.max(0, Math.min(SLOT_COUNT - 1, Math.floor(ratio * SLOT_COUNT)));
        const slot = SLOTS[index];
        if (slot === lastSlot.current) return;
        lastSlot.current = slot;
        setActiveSlot(slot);
        onSelect(toDateStr(slotToDay(slot)));
    };

    const handleEnd = () => {
        lastSlot.current = null;
        setActiveSlot(null);
    };

    return (
        <div
            className="absolute left-0 top-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] w-6 z-20 flex flex-col touch-none select-none cursor-pointer"
            aria-label="快速跳到日期"
            onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                selectAtPointer(e);
            }}
            onPointerMove={(e) => {
                if (lastSlot.current !== null) selectAtPointer(e);
            }}
            onPointerUp={handleEnd}
            onPointerCancel={handleEnd}
        >
            {SLOTS.map((slot) => {
                const hasRecords = slotHasRecords(slot);
                return (
                    <div key={slot} className="flex-1 min-h-0 flex items-center justify-center">
                        {slot === todaySlot ? (
                            <span className="w-4 h-4 rounded-full bg-gray-900 text-white flex items-center justify-center text-[9px] leading-none font-bold tabular-nums">
                                {slot}
                            </span>
                        ) : slot % 2 === 0 ? (
                            <span className={`text-[10px] leading-none font-medium tabular-nums ${hasRecords ? 'text-gray-500' : 'text-gray-300'}`}>
                                {slot}
                            </span>
                        ) : (
                            <span className={`w-1 h-1 rounded-full ${hasRecords ? 'bg-gray-500' : 'bg-gray-300'}`} />
                        )}
                    </div>
                );
            })}

            {activeSlot !== null && (
                <div
                    className="absolute left-7 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-gray-800 text-white text-sm font-bold whitespace-nowrap pointer-events-none"
                    style={{ top: `${((SLOT_COUNT - activeSlot + 0.5) / SLOT_COUNT) * 100}%` }}
                >
                    {slotToDay(activeSlot)} 號
                </div>
            )}
        </div>
    );
};

export default React.memo(DateScrubber);
