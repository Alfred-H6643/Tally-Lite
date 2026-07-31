import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface BottomNavigationProps {
    onAddClick: () => void;
}

/** Shared outline-icon styling, matching the original report (pie chart) icon. */
const iconProps = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
} as const;

interface NavButtonProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

const NavButton: React.FC<NavButtonProps> = ({ label, isActive, onClick, children }) => (
    <button
        onClick={onClick}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
        className={`w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors ${isActive ? 'text-blue-500 bg-blue-50' : 'text-gray-400'}`}
    >
        {children}
    </button>
);

const BottomNavigation: React.FC<BottomNavigationProps> = React.memo(({ onAddClick }) => {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // Account lives under /settings, so it has to be excluded from the settings tab
    // or both would light up at once.
    const isAccount = pathname === '/settings/account';

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-3 flex justify-around items-center z-40 pb-safe">
            {/* 首頁 */}
            <NavButton label="首頁" isActive={pathname === '/'} onClick={() => navigate('/')}>
                <svg {...iconProps}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            </NavButton>

            {/* 報表 */}
            <NavButton label="報表" isActive={pathname.startsWith('/report')} onClick={() => navigate('/report')}>
                <svg {...iconProps}>
                    <path d="M4 4v16" />
                    <line x1="8" y1="8" x2="17" y2="8" />
                    <line x1="8" y1="13" x2="21" y2="13" />
                    <line x1="8" y1="18" x2="13" y2="18" />
                </svg>
            </NavButton>

            {/* 新增交易 */}
            <button
                onClick={onAddClick}
                aria-label="新增交易"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#E3B873] text-white shadow-lg shadow-orange-100 active:bg-[#dcae63] active:scale-95 transition-all"
            >
                <svg {...iconProps} strokeWidth={3}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            {/* 設定 */}
            <NavButton
                label="設定"
                isActive={pathname.startsWith('/settings') && !isAccount}
                onClick={() => navigate('/settings')}
            >
                <svg {...iconProps} strokeWidth={2}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            </NavButton>

            {/* 帳號 */}
            <NavButton label="帳號設定" isActive={isAccount} onClick={() => navigate('/settings/account')}>
                <svg {...iconProps}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            </NavButton>
        </div>
    );
});

export default BottomNavigation;
