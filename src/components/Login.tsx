import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
// 註冊功能已隱藏
// 原因：此應用定位為「個人使用 + Demo」，不開放自行註冊
// 狀態：基本功能已完成，但因產品定位改變而暫時隱藏
// 如需開放註冊，請取消以下註解並取消第 32-33 行和第 124-131 行的註解
// import Register from './Register';

const Login: React.FC = () => {
    const { loginAsGuest } = useFirebaseAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // 註冊功能已隱藏：不再需要 showRegister state
    // const [showRegister, setShowRegister] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            console.error('Login error:', err);
            setError('登入失敗，請檢查帳號密碼');
        } finally {
            setLoading(false);
        }
    };

    // 註冊功能已隱藏：不再顯示註冊畫面
    // if (showRegister) {
    //     return <Register onSwitchToLogin={() => setShowRegister(false)} />;
    // }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl">
                <div className="text-center mb-10">
                    <div className="w-24 h-24 bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-100 overflow-hidden border border-gray-100 p-2">
                        <img
                            src="/logo.png"
                            alt="A+ 記帳"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">A+ 記帳</h1>
                    <p className="text-gray-400 text-sm font-medium">記錄生活的每一份收支</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {/* Guest Login Section - Priority */}
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={loginAsGuest}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-200 flex items-center justify-center group"
                        >
                            <span>訪客登入 (Demo)</span>
                            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                        <p className="text-center text-xs text-gray-400">
                            無需註冊，直接體驗完整功能
                        </p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">一般登入</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            密碼
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition-colors shadow-lg shadow-gray-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                    >
                        {loading ? '登入' : '登入'}
                    </button>

                    {/* 註冊功能已隱藏：不開放自行註冊 */}
                    {/* <div className="text-center">
                        <button
                            type="button"
                            onClick={() => setShowRegister(true)}
                            className="text-sm text-gray-600 hover:text-gray-900 font-medium underline decoration-gray-300 underline-offset-4"
                        >
                            註冊新帳號
                        </button>
                    </div> */}
                </form>
            </div>
        </div>
    );
};

export default Login;
