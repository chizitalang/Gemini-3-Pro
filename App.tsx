
import React, { useEffect, useState } from 'react';
import { PasswordGenerator } from './components/PasswordGenerator';
import { HistoryTable } from './components/HistoryTable';
import { api, isMockMode } from './services/api';
import { CredentialRecord } from './types';
import { LayoutDashboard, Lock, Server, Wifi, WifiOff } from 'lucide-react';

const App: React.FC = () => {
  const [history, setHistory] = useState<CredentialRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<'generator' | 'history'>('generator');

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const records = await api.getHistory();
      // Sort by date desc
      const sorted = records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setHistory(sorted);
    } catch (e) {
      console.error("Failed to fetch history", e);
      // If fetch fails (e.g. backend down), activeTab stays but history is empty
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-md">
                <Lock className="text-white w-6 h-6" />
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight">SecureGen</span>
            </div>
            <div className="flex items-center space-x-4">
                {/* Tab Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('generator')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'generator' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <LayoutDashboard className="w-4 h-4" /> Generator
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Server className="w-4 h-4" /> History
                    </button>
                </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow">
        {activeTab === 'generator' ? (
            <div className="animate-in fade-in duration-500">
                 <div className="mb-8 text-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Create Strong Credentials</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Generate NIST-compliant passwords paired with custom usernames. 
                        All records are securely logged to your {isMockMode ? 'local' : 'remote'} database.
                    </p>
                 </div>
                 <PasswordGenerator onRecordCreated={fetchHistory} />
                 
                 {/* Mini History Preview */}
                 <div className="mt-16">
                    <div className="flex items-center justify-between mb-4">
                         <h3 className="text-xl font-bold text-gray-800">Recent Activity</h3>
                         <button onClick={() => setActiveTab('history')} className="text-indigo-600 text-sm font-medium hover:underline">View Full History &rarr;</button>
                    </div>
                    <div className="opacity-70 pointer-events-none select-none filter blur-[1px]">
                        {/* Visual placeholder to encourage clicking history */}
                        <HistoryTable records={history.slice(0, 3)} isLoading={false} onRefresh={fetchHistory} />
                    </div>
                 </div>
            </div>
        ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <HistoryTable records={history} isLoading={isLoadingHistory} onRefresh={fetchHistory} />
            </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} SecureGen.
          </p>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
            {isMockMode ? (
               <>
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                <span className="text-xs font-medium text-gray-600">Mock Backend (Demo Mode)</span>
               </>
            ) : (
               <>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-xs font-medium text-gray-600">FastAPI Connected</span>
               </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
