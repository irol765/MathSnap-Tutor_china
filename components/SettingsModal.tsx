
import React, { useState, useEffect } from 'react';
import { Icons } from './Icon';
import { AISettings, AIProvider, Language } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (settings: AISettings) => void;
  lang: Language;
}

const PROVIDERS: { id: AIProvider; name: string }[] = [
  { id: 'gemini', name: 'Google Gemini' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'qwen', name: 'Qwen (Alibaba)' }
];

interface ModelOption {
  label: string;
  value: string;
}

const MODEL_OPTIONS: Record<string, ModelOption[]> = {
  gemini: [
    { label: 'Gemini 2.5 Flash (Recommended)', value: 'gemini-2.5-flash' },
    { label: 'Gemini 3 Pro Preview', value: 'gemini-3-pro-preview' },
    { label: 'Gemini 2.0 Flash Exp', value: 'gemini-2.0-flash-exp' }
  ],
  openai: [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' }
  ],
  qwen: [
    { label: 'Qwen2.5-VL-72B (Best for Math)', value: 'qwen2.5-vl-72b-instruct' },
    { label: 'Qwen-VL-Max (Flagship)', value: 'qwen-vl-max-latest' },
    { label: 'Qwen-VL-Plus (Balanced)', value: 'qwen-vl-plus-latest' },
    { label: 'Qwen2.5-VL-7B (Fast)', value: 'qwen2.5-vl-7b-instruct' }
  ]
};

const API_LINKS: Record<AIProvider, { en: string; zh: string; url: string }> = {
  gemini: {
    en: "Get Google AI Studio Key",
    zh: "免费获取 Google AI Studio Key",
    url: "https://aistudio.google.com/app/apikey"
  },
  openai: {
    en: "Get OpenAI API Key",
    zh: "获取 OpenAI API Key",
    url: "https://platform.openai.com/api-keys"
  },
  qwen: {
    en: "Get Alibaba Cloud DashScope Key",
    zh: "获取阿里云百炼 (DashScope) Key",
    url: "https://bailian.console.aliyun.com/?apiKey=1"
  }
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, lang }) => {
  const [localSettings, setLocalSettings] = useState<AISettings>(settings);
  
  // Sync prop settings to local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const t = {
    en: {
      title: 'Settings',
      provider: 'AI Provider',
      model: 'Model',
      apiKey: 'API Key',
      baseUrl: 'Base URL (Optional)',
      save: 'Save Changes',
      cancel: 'Cancel',
      enterKey: (name: string) => `Enter your ${name} API Key`,
    },
    zh: {
      title: '设置',
      provider: 'AI 提供商',
      model: '模型',
      apiKey: 'API Key',
      baseUrl: 'API 地址 (可选)',
      save: '保存更改',
      cancel: '取消',
      enterKey: (name: string) => `输入您的 ${name} API Key`,
    }
  };

  const text = t[lang];

  const handleProviderChange = (provider: AIProvider) => {
    let defaultBaseUrl = '';
    if (provider === 'qwen') defaultBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    else if (provider === 'openai') defaultBaseUrl = 'https://api.openai.com/v1';

    // Automatically select the first model of the new provider if available, otherwise clear or keep
    let defaultModel = '';
    if (MODEL_OPTIONS[provider]) {
      defaultModel = MODEL_OPTIONS[provider][0].value;
    }

    setLocalSettings(prev => ({
      ...prev,
      provider,
      model: defaultModel,
      baseUrl: defaultBaseUrl
    }));
  };

  const handleKeyChange = (value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      keys: {
        ...prev.keys,
        [prev.provider]: value
      }
    }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const getBaseUrlPlaceholder = () => {
    switch (localSettings.provider) {
      case 'qwen': return 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      case 'openai': return 'https://api.openai.com/v1';
      case 'gemini': return 'https://generativelanguage.googleapis.com';
      default: return 'https://...';
    }
  };

  const currentProviderOptions = MODEL_OPTIONS[localSettings.provider] || [];
  
  // Safe model value for dropdown
  const currentModelValue = currentProviderOptions.some(opt => opt.value === localSettings.model) 
    ? localSettings.model 
    : currentProviderOptions[0]?.value;

  const apiLink = API_LINKS[localSettings.provider];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center text-white space-x-2">
            <Icons.Settings className="w-5 h-5" />
            <h2 className="text-lg font-bold">{text.title}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{text.provider}</label>
            <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={`flex-1 min-w-[30%] py-2 text-sm font-medium rounded-lg transition-all ${
                    localSettings.provider === p.id 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-2">{text.model}</label>
             <div className="relative">
                <select
                  value={currentModelValue}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none text-slate-900"
                >
                    {currentProviderOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
             </div>
             {localSettings.provider === 'qwen' && (
                <p className="text-xs text-slate-400 mt-2 px-1">
                  {lang === 'zh' ? '推荐使用 Qwen2.5-VL-72B，这是目前最强的开源几何与视觉模型。' : 'Qwen2.5-VL-72B is recommended for best geometry and OCR performance.'}
                </p>
             )}
          </div>

          {/* API Key Input */}
          <div>
             <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-semibold text-slate-700">{text.apiKey}</label>
                <a 
                  href={apiLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex items-center bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                >
                  {lang === 'zh' ? apiLink.zh : apiLink.en}
                  <svg className="w-3 h-3 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </a>
             </div>
             <input
               type="password"
               value={localSettings.keys[localSettings.provider]}
               onChange={(e) => handleKeyChange(e.target.value)}
               placeholder={text.enterKey(PROVIDERS.find(p => p.id === localSettings.provider)?.name || '')}
               className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-mono text-sm text-slate-900"
             />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{text.baseUrl}</label>
            <input
              type="text"
              value={localSettings.baseUrl || ''}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
              placeholder={getBaseUrlPlaceholder()}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm text-slate-900"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-medium hover:bg-slate-100 transition-colors"
          >
            {text.cancel}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
          >
            {text.save}
          </button>
        </div>
      </div>
    </div>
  );
};
