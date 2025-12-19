import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface BottomNavigationProps {
    onAddClick: () => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ onAddClick }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isReport = location.pathname === '/report';

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-6 py-4 flex justify-between items-center z-40 pb-safe">
            {/* Left: Toggle View (Report <-> List) */}
            <button
                onClick={() => navigate(isReport ? '/' : '/report')}
                className={`w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors ${isReport ? 'text-blue-500 bg-blue-50' : 'text-gray-400'}`}
            >
                {isReport ? (
                    /* List Icon (Back to Dashboard) */
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                ) : (
                    /* Pie Chart Icon (Go to Report) */
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                        <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                    </svg>
                )}
            </button>

            {/* Center: Add Transaction (Pill Button) */}
            <button
                onClick={onAddClick}
                className="bg-[#E3B873] active:bg-[#dcae63] text-white px-8 py-3 rounded-full flex items-center gap-2 shadow-lg shadow-orange-100 active:scale-95 transition-all"
            >
                <span className="text-xl font-bold">＋</span>
                <span className="font-bold tracking-wide">新紀錄</span>
            </button>

            {/* Right: Menu/Settings */}
            <button
                onClick={() => navigate(location.pathname === '/settings' ? '/' : '/settings')}
                className={`w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors ${location.pathname.startsWith('/settings') ? 'text-blue-500 bg-blue-50' : 'text-gray-400'}`}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
            </button>
        </div>
    );
};

export default BottomNavigation;
