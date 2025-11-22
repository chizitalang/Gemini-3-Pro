import React, { useState } from 'react';
import { Lock, User, UserPlus, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface AuthPageProps {
  onLoginSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
        setError("Please fill in all fields");
        return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        await api.login(username, password);
      } else {
        await api.register(username, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-center">
          <div className="mx-auto w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            SecureGen Vault
          </h2>
          <p className="text-indigo-100 text-sm mt-2">
            Securely manage your generated credentials.
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
             <button 
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                Log In
             </button>
             <button 
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                Sign Up
             </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-in slide-in-from-top-1">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Username</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Enter your username"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-6"
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : isLogin ? (
                    <>Log In <ArrowRight className="w-4 h-4" /></>
                ) : (
                    <>Create Account <UserPlus className="w-4 h-4" /></>
                )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
             {isLogin ? "New here? Switch to Sign Up above." : "Already have an account? Switch to Log In."}
          </p>
          {isLogin && (
            <p className="text-center text-xs text-indigo-300 mt-2 bg-indigo-50 py-1 rounded">
              Default: <b>admin</b> / <b>admin</b>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};