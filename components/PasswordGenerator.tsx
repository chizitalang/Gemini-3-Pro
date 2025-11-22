
import React, { useState } from 'react';
import { RefreshCw, Copy, Check, ShieldCheck, Wand2, Loader2, StickyNote, Folder, User, Type, Settings2, Hash } from 'lucide-react';
import { GenerateConfig, CredentialRecord } from '../types';
import { api } from '../services/api';

interface PasswordGeneratorProps {
  onRecordCreated: () => void;
}

const USERNAME_PRESETS = [
    { label: 'Friendly Name', value: '{adjective}{noun}{number}', description: 'e.g. SilentFox42' },
    { label: 'User ID', value: 'user_####', description: 'e.g. user_8392' },
    { label: 'Email Address', value: '{noun}{number}@example.com', description: 'e.g. Bear99@example.com' },
    { label: 'Service Account', value: 'svc_{noun}_##', description: 'e.g. svc_Tiger_07' },
    { label: 'Short ID', value: 'u_?????', description: 'e.g. u_xqkzf' },
];

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ onRecordCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedRecord, setGeneratedRecord] = useState<CredentialRecord | null>(null);
  const [copied, setCopied] = useState<'user' | 'pass' | null>(null);
  
  const [config, setConfig] = useState<GenerateConfig>({
    username: '',
    usernameType: 'manual',
    usernamePattern: '{adjective}{noun}{number}',
    remark: '',
    group: '',
    length: 16,
    useUppercase: true,
    useNumbers: true,
    useSymbols: true,
  });

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const record = await api.generateAndSave(config);
      setGeneratedRecord(record);
      onRecordCreated();
    } catch (error) {
      console.error("Failed to generate", error);
      alert("Failed to generate credentials. Check console.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: 'user' | 'pass') => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  // Calculate Strength based on config
  const getStrength = () => {
    let s = 0;
    // Base length score
    s += Math.min(config.length * 4, 50); 
    
    // Variety bonus
    let varietyCount = 1; // lowercase is always there
    if (config.useUppercase) { s += 15; varietyCount++; }
    if (config.useNumbers) { s += 15; varietyCount++; }
    if (config.useSymbols) { s += 20; varietyCount++; }

    // Penalties
    if (config.length < 8) s = Math.min(s, 20); // Cap score for very short passwords
    if (varietyCount < 2 && config.length < 20) s -= 10; // Penalty for lack of variety unless very long

    if (s < 0) s = 0;
    if (s > 100) s = 100;

    let label = '';
    let color = '';
    let textColor = '';
    let bgColor = '';

    if (s < 40) {
      label = 'Weak';
      color = 'bg-red-500';
      textColor = 'text-red-700';
      bgColor = 'bg-red-50';
    } else if (s < 70) {
      label = 'Moderate';
      color = 'bg-yellow-500';
      textColor = 'text-yellow-700';
      bgColor = 'bg-yellow-50';
    } else if (s < 90) {
      label = 'Strong';
      color = 'bg-blue-500';
      textColor = 'text-blue-700';
      bgColor = 'bg-blue-50';
    } else {
      label = 'Very Strong';
      color = 'bg-emerald-500';
      textColor = 'text-emerald-700';
      bgColor = 'bg-emerald-50';
    }

    return { score: s, label, color, textColor, bgColor };
  };

  const strength = getStrength();

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8 bg-gradient-to-r from-indigo-600 to-purple-600">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8" />
            Secure Credential Generator
          </h2>
          <p className="text-indigo-100 mt-2">
            Generate cryptographically secure passwords and store them in your secured vault.
          </p>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Configuration Section */}
          <div className="space-y-6">
            
            {/* Username Configuration */}
            <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    Username Configuration
                </label>
                
                {/* Type Toggles */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setConfig({ ...config, usernameType: 'manual' })}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${config.usernameType === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Type className="w-4 h-4" /> Manual
                    </button>
                    <button 
                        onClick={() => setConfig({ ...config, usernameType: 'pattern' })}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${config.usernameType === 'pattern' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Settings2 className="w-4 h-4" /> Pattern / Auto
                    </button>
                </div>

                {/* Conditional Inputs */}
                {config.usernameType === 'manual' ? (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                         <input
                            type="text"
                            value={config.username}
                            onChange={(e) => setConfig({ ...config, username: e.target.value })}
                            placeholder="e.g. john.doe"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                ) : (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Format Preset</label>
                            <select 
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                value={USERNAME_PRESETS.find(p => p.value === config.usernamePattern)?.value ? config.usernamePattern : 'custom'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val !== 'custom') {
                                        setConfig({ ...config, usernamePattern: val });
                                    }
                                }}
                            >
                                {USERNAME_PRESETS.map(preset => (
                                    <option key={preset.value} value={preset.value}>
                                        {preset.label} ({preset.description})
                                    </option>
                                ))}
                                <option value="custom">Custom Pattern...</option>
                            </select>
                        </div>
                        <div>
                             <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block flex items-center justify-between">
                                Pattern String
                                <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">Editable</span>
                             </label>
                             <div className="relative">
                                <input
                                    type="text"
                                    value={config.usernamePattern}
                                    onChange={(e) => setConfig({ ...config, usernamePattern: e.target.value })}
                                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                    placeholder="user_###"
                                />
                                <Hash className="w-3 h-3 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                             </div>
                             <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                                <span className="font-bold text-gray-500">#</span> = digit, 
                                <span className="font-bold text-gray-500 ml-1">?</span> = letter,
                                <span className="font-bold text-gray-500 ml-1">{`{noun}`}</span>, 
                                <span className="font-bold text-gray-500 ml-1">{`{adjective}`}</span>
                             </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remark (Optional)</label>
                <input
                  type="text"
                  value={config.remark || ''}
                  onChange={(e) => setConfig({ ...config, remark: e.target.value })}
                  placeholder="e.g. AWS Root"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group (Optional)</label>
                <input
                  type="text"
                  value={config.group || ''}
                  onChange={(e) => setConfig({ ...config, group: e.target.value })}
                  placeholder="e.g. Work"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Length: <span className="font-bold text-indigo-600">{config.length}</span>
              </label>
              <input
                type="range"
                min="4"
                max="64"
                value={config.length}
                onChange={(e) => setConfig({ ...config, length: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>4 chars</span>
                <span>64 chars</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.useUppercase}
                  onChange={(e) => setConfig({ ...config, useUppercase: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-gray-700 group-hover:text-indigo-700 transition-colors">Include Uppercase (A-Z)</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.useNumbers}
                  onChange={(e) => setConfig({ ...config, useNumbers: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-gray-700 group-hover:text-indigo-700 transition-colors">Include Numbers (0-9)</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config.useSymbols}
                  onChange={(e) => setConfig({ ...config, useSymbols: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-gray-700 group-hover:text-indigo-700 transition-colors">Include Symbols (!@#$)</span>
              </label>
            </div>

            {/* Strength Indicator */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 transition-colors duration-300">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-gray-700">Estimated Strength</span>
                <span className={`text-xs font-bold px-2 py-1 rounded uppercase transition-colors duration-300 ${strength.bgColor} ${strength.textColor}`}>
                  {strength.label}
                </span>
              </div>
              <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ease-out rounded-full ${strength.color}`} 
                  style={{ width: `${strength.score}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                  {strength.label === 'Weak' && "Try increasing length and adding numbers/symbols."}
                  {strength.label === 'Moderate' && "Decent, but could be stronger."}
                  {strength.label === 'Strong' && "Good balance of length and complexity."}
                  {strength.label === 'Very Strong' && "Excellent! This will be very hard to crack."}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" /> Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" /> Generate Credentials
                </>
              )}
            </button>
          </div>

          {/* Result Section */}
          <div className="flex flex-col justify-center">
            {!generatedRecord ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl p-6 min-h-[300px]">
                <RefreshCw className="w-16 h-16 mb-4 text-gray-200" />
                <p>Configure settings and click Generate</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                  <h3 className="text-emerald-800 font-semibold mb-4 flex items-center gap-2">
                    <Check className="w-5 h-5" /> Successfully Generated
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Username</label>
                      <div className="flex gap-2 mt-1">
                        <code className="flex-1 bg-white border border-emerald-200 px-4 py-3 rounded-lg text-gray-800 font-mono break-all">
                          {generatedRecord.username}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generatedRecord.username, 'user')}
                          className="p-3 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
                          title="Copy Username"
                          aria-label="Copy username"
                        >
                          {copied === 'user' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Password</label>
                      <div className="flex gap-2 mt-1">
                        <code className="flex-1 bg-white border border-emerald-200 px-4 py-3 rounded-lg text-gray-800 font-mono break-all text-lg font-bold">
                          {generatedRecord.password_plain}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generatedRecord.password_plain, 'pass')}
                          className="p-3 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors"
                          title="Copy Password"
                          aria-label="Copy password"
                        >
                          {copied === 'pass' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      {generatedRecord.remark && (
                        <div>
                          <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                              <StickyNote className="w-3 h-3" /> Remark
                          </label>
                          <div className="mt-1 text-sm text-emerald-800 italic">
                            "{generatedRecord.remark}"
                          </div>
                        </div>
                      )}
                      {generatedRecord.group && (
                        <div>
                          <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                              <Folder className="w-3 h-3" /> Group
                          </label>
                          <div className="mt-1 text-sm text-emerald-800 italic">
                            {generatedRecord.group}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-emerald-600/70 mt-4 text-center">
                    This record has been saved to the history database.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
