import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { LoginPage } from './LoginPage';

export function UserMenu() {
    const { user, signOut } = useAuth();
    const [showLogin, setShowLogin] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        await signOut();
        setLoading(false);
    };

    if (showLogin && !user) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="relative w-full max-w-md">
                    <button
                        onClick={() => setShowLogin(false)}
                        className="absolute -top-12 right-0 text-white/50 hover:text-white"
                    >
                        Fechar
                    </button>
                    <LoginPage />
                </div>
            </div>
        );
    }

    if (user) {
        return (
            <div className="flex items-center gap-3 pl-3 border-l border-[#30363d]">
                <div className="flex flex-col items-end mr-2">
                    <span className="text-xs font-medium text-[#f0f6fc]">{user.email}</span>
                    <span className="text-[10px] text-[#2aa0a0]">Admin</span>
                </div>
                <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="p-2 rounded-lg bg-[#21262d] text-[#8b949e] hover:text-red-400 hover:bg-[#30363d] transition-all border border-[#30363d]"
                    title="Sair"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                </button>
            </div>
        );
    }

    return (
        <div className="pl-3 border-l border-[#30363d]">
            <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#208080] text-white hover:bg-[#2aa0a0] transition-colors shadow-lg shadow-[#208080]/20"
            >
                <LogIn className="w-4 h-4" />
                <span className="text-sm font-medium">Login</span>
            </button>
        </div>
    );
}
