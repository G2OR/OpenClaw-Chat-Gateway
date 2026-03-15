import { useState, useEffect } from 'react';
import { Plus, Settings, ArrowLeft, X, Network, Terminal, Edit2, Trash2, Info, Cpu } from 'lucide-react';
import { Reorder } from 'motion/react';
import { ViewType, SettingsTab } from '../App';

interface SidebarProps {
  currentView: ViewType;
  settingsTab?: SettingsTab;
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  isMobileMenuOpen: boolean;
  sessions: {id: string, name: string}[];
  sessionsLoaded: boolean;
  reloadSessions: () => Promise<void>;
  reorderSessions: (newSessions: {id: string, name: string}[]) => Promise<void>;
  navigateTo: (view: ViewType, tab?: SettingsTab, openMenu?: boolean) => void;
}

function SessionSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3].map(i => (
        <div key={i} className="w-full py-2 px-3 rounded-xl border border-transparent animate-pulse">
          <div className="flex items-baseline gap-2">
            <div className="h-4 bg-gray-200 rounded-md w-20" />
            <div className="h-3 bg-gray-100 rounded-md w-12" />
          </div>
          <div className="mt-2">
            <div className="h-5 bg-gray-100 rounded-full w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SidebarHeader() {
  return (
    <div className="pt-4 pb-6 px-6">
      <div className="text-2xl font-black text-gray-900 tracking-tighter leading-tight mb-1">OpenClaw</div>
      <div className="text-[1.15rem] font-bold text-gray-400 tracking-widest uppercase leading-tight">CHAT GATEWAY</div>
    </div>
  );
}

export default function Sidebar({ 
  currentView, 
  settingsTab = 'gateway', 
  activeSessionId, 
  setActiveSessionId, 
  isMobileMenuOpen, 
  sessions,
  sessionsLoaded,
  reloadSessions,
  reorderSessions,
  navigateTo
}: SidebarProps) {
  
  // On first render, use a plain static list (no Framer Motion).
  // After mount, switch to Reorder for drag support.
  const [enableReorder, setEnableReorder] = useState(false);
  useEffect(() => {
    // Use requestAnimationFrame to ensure the first paint has completed
    requestAnimationFrame(() => {
      setEnableReorder(true);
    });
  }, []);

  // Modal State
  const [newSessionData, setNewSessionData] = useState({ 
    id: '', name: '', model: '',
    soulContent: '', userContent: '', agentsContent: '', toolsContent: '', heartbeatContent: '', identityContent: ''
  });
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'soul'|'user'|'agents'|'tools'|'heartbeat'|'identity'>('soul');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');


  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // New Session/Persona Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch models on mount and whenever modal opens to ensure fresh list
  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.success) setAvailableModels(data.models);
      })
      .catch(console.error);
  }, [isModalOpen]);

  // Info Modal State
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [viewingSession, setViewingSession] = useState<any>(null);

  // Template contents for new agents
  const templates = {
    soul: `# SOUL.md - 智能體人格與核心設定
在此定義智能體的性格、價值觀、語言風格以及核心行為準則。

## 示範：
- 性格：專業、嚴謹且富有耐心。
- 語言：多用短句，語氣溫和，避免使用過多的表情符號。
- 準則：在處理代碼時，必須優先考慮安全性和性能。`,
    user: `# USER.md - 用戶畫像
在此記錄關於用戶的偏好、背景信息以及智能體應該如何對待用戶。

## 示範：
- 用戶身份：一名資深的全棧開發工程師。
- 偏好：喜歡直接了當的回答，不需要過多的解釋背景。
- 項目背景：目前正在開發一個基于 TypeScript 的分佈式網關係統。`,
    agents: `# AGENTS.md - 協作智能體
在此定義智能體知曉的其他協作角色及其交互協議。

## 示範：
- 協作對象：[DevOps_Agent](agent_id)
- 場景：當代碼通過審核后，自動將部署包發送給 DevOps_Agent。`,
    tools: `# TOOLS.md - 工具與能力
在此描述智能體可以調用的特殊工具、API 及其使用說明。

## 示範：
- 搜索：使用 DuckDuckGo 搜索最新的技術文檔。
- 計算：支持復雜的數學運算和數據繪圖能力。`,
    heartbeat: `# HEARTBEAT.md - 定時任務
在此定義智能體在后臺運行時的周期性動作或自我思考邏輯。

## 示範：
- 每隔 1 小時：核查項目進度并整理待辦事項。
- 每日凌晨：自動備份最近的對話摘要到記憶庫。`,
    identity: `# IDENTITY.md - 身份認同
在此定義智能體對自我的稱呼、起源以及其在系統中的定位。

## 示範：
- 稱呼：首席架構師助手。
- 角色：負責代碼審查、技術方案設計以及核心庫維護。`
  };


  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionData.name.trim()) return;

    try {
      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newSessionData.id,
            name: newSessionData.name,
            model: newSessionData.model,
            soulContent: newSessionData.soulContent,
            userContent: newSessionData.userContent,
            agentsContent: newSessionData.agentsContent,
            toolsContent: newSessionData.toolsContent,
            heartbeatContent: newSessionData.heartbeatContent,
            identityContent: newSessionData.identityContent,
          })
        });
      } else if (modalMode === 'edit' && editingSessionId) {
        res = await fetch(`/api/sessions/${editingSessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newSessionData.name,
            model: newSessionData.model,
            soulContent: newSessionData.soulContent,
            userContent: newSessionData.userContent,
            agentsContent: newSessionData.agentsContent,
            toolsContent: newSessionData.toolsContent,
            heartbeatContent: newSessionData.heartbeatContent,
            identityContent: newSessionData.identityContent,
          })
        });
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsModalOpen(false);
          setSubmitError(null);
          setNewSessionData({ id: '', name: '', model: '', soulContent: '', userContent: '', agentsContent: '', toolsContent: '', heartbeatContent: '', identityContent: '' });
          await reloadSessions();
          if (modalMode === 'create' && data.session?.id) {
            setActiveSessionId(data.session.id);
            navigateTo('chat');
          }
        } else {
          setSubmitError(data.error || '創建失敗，請重試');
        }
      } else if (res && !res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || '請求失敗，請檢查網絡或日志');
      }
    } catch (err) {
      console.error('Failed to handle modal submit:', err);
      setSubmitError('網絡錯誤，請重試');
    }
  };

  const confirmDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingSessionId(id);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSession = async () => {
    if (deletingSessionId) {
      try {
        const res = await fetch(`/api/sessions/${deletingSessionId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          setIsDeleteModalOpen(false);
          await reloadSessions();
        }
      } catch (err) {
        console.error('Failed to delete session:', err);
      } finally {
        setIsDeleteModalOpen(false);
        setDeletingSessionId(null);
      }
    }
  };

  const handleStartEdit = async (e: React.MouseEvent | null, session: {id: string, name: string}) => {
    if (e) e.stopPropagation();
    
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        const fullSession = data.find((s: any) => s.id === session.id);
        
        let configs = { soulContent: '', userContent: '', agentsContent: '', toolsContent: '', heartbeatContent: '', identityContent: '', model: '' };
        if (fullSession) {
          const configRes = await fetch(`/api/sessions/${session.id}/configs`);
          if (configRes.ok) {
            const configData = await configRes.json();
            if (configData.success) {
              configs = configData.configs;
            }
          }
          
          setNewSessionData({ 
            id: fullSession.agentId || '',
            name: fullSession.name || '', 
            model: configs.model || '',
            soulContent: configs.soulContent || '',
            userContent: configs.userContent || '',
            agentsContent: configs.agentsContent || '',
            toolsContent: configs.toolsContent || '',
            heartbeatContent: configs.heartbeatContent || '',
            identityContent: configs.identityContent || '',
          });
          setEditingSessionId(session.id);
          setModalMode('edit');
          setIsModalOpen(true);
          setIsInfoModalOpen(false);
        }
      }
    } catch (e) {
      console.error('Failed to fetch session details for editing', e);
    }
  };

  const handleShowInfo = async (e: React.MouseEvent, session: {id: string, name: string}) => {
    e.stopPropagation();
    setIsInfoModalOpen(true);

    setViewingSession(session);

    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        const fullSession = data.find((s: any) => s.id === session.id);
        if (fullSession) {
          setViewingSession(fullSession);
        }
      }
    } catch (e) {
      console.error('Failed to fetch session details for info', e);
    }
  };


  const renderSessionCard = (s: {id: string, name: string}) => (
    <div
      onClick={() => { setActiveSessionId(s.id); navigateTo('chat', settingsTab, false); }}
      className={`w-full group text-left py-2 px-3 text-sm rounded-xl transition-colors flex items-center justify-between cursor-pointer border ${activeSessionId === s.id ? 'bg-blue-50 border-blue-300 text-black' : 'text-gray-900 hover:bg-gray-200 border-transparent hover:border-gray-300'}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-col items-start gap-1.5">
          <div className={`text-[15px] truncate w-full text-black flex-1 min-w-0 ${activeSessionId === s.id ? 'font-bold' : ''}`}>
            {s.name || `智能體 ${s.id}`}
          </div>
          {(s as any).model && (
            <div className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border truncate flex-shrink-0 bg-blue-50 text-blue-600 border-blue-200">
              {(s as any).model}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-2">
        <button 
          onClick={(e) => handleShowInfo(e, s)} 
          className="p-1.5 bg-white text-blue-500 hover:bg-yellow-100 hover:text-yellow-600 rounded-lg transition-all"
          title="詳情"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  );


  if (currentView === 'settings') {
    return (
      <>
        {/* Mobile Backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" 
            onClick={() => navigateTo(currentView, settingsTab, false)} 
          />
        )}
        <aside className={`fixed inset-y-0 left-0 z-50 w-[75vw] md:w-64 flex-shrink-0 flex-col border-r border-gray-300 bg-gray-100 h-full transition-transform duration-300 md:relative md:translate-x-0 md:flex ${isMobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'}`}>
          <SidebarHeader />
        <nav className="flex-1 px-4 py-2 space-y-1">
          <button 
            onClick={() => navigateTo('settings', 'gateway', false)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold border ${settingsTab === 'gateway' ? 'text-blue-600 bg-blue-50 border-blue-300' : 'text-gray-600 hover:bg-gray-200 border-transparent'}`}
          >
            <Network className="w-5 h-5" />
            網關設置
          </button>
          <button 
            onClick={() => navigateTo('settings', 'general', false)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold border ${settingsTab === 'general' ? 'text-blue-600 bg-blue-50 border-blue-300' : 'text-gray-600 hover:bg-gray-200 border-transparent'}`}
          >
            <Settings className="w-5 h-5" />
            通用設置
          </button>
          <button 
            onClick={() => navigateTo('settings', 'models', false)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold border ${settingsTab === 'models' ? 'text-blue-600 bg-blue-50 border-blue-300' : 'text-gray-600 hover:bg-gray-200 border-transparent'}`}
          >
            <Cpu className="w-5 h-5" />
            模型管理
          </button>
          
          <button 
            onClick={() => navigateTo('settings', 'commands', false)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold border ${settingsTab === 'commands' ? 'text-blue-600 bg-blue-50 border-blue-300' : 'text-gray-600 hover:bg-gray-200 border-transparent'}`}
          >
            <Terminal className="w-5 h-5" />
            快捷指令
          </button>

          <button 
            onClick={() => navigateTo('settings', 'about', false)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold border ${settingsTab === 'about' ? 'text-blue-600 bg-blue-50 border-blue-300' : 'text-gray-600 hover:bg-gray-200 border-transparent'}`}
          >
            <Info className="w-5 h-5" />
            關於
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => navigateTo('chat', settingsTab, false)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-xl transition-all font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">返回對話</span>
          </button>
        </div>
      </aside>
      </>
    );
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => navigateTo(currentView, settingsTab, false)} 
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[75vw] md:w-64 flex-shrink-0 flex-col border-r border-gray-300 bg-gray-100 h-full transition-transform duration-300 md:relative md:translate-x-0 md:flex ${isMobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'}`}>
        <SidebarHeader />

      <div className="px-4 pb-4">
        <button 
          onClick={() => {
            setModalMode('create');
            setEditingSessionId(null);
            setSubmitError(null);
            setNewSessionData({ 
              id: '', 
              name: `新智能體 ${sessions.length + 1}`, 
              model: '', 
              soulContent: '', 
              userContent: '', 
              agentsContent: '', 
              toolsContent: '', 
              heartbeatContent: '', 
              identityContent: '' 
            });
            setIsModalOpen(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-300 text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-colors bg-white font-bold text-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          新建智能體
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
        {!sessionsLoaded ? (
          <SessionSkeleton />
        ) : enableReorder ? (
        <Reorder.Group axis="y" values={sessions} onReorder={reorderSessions} className="space-y-1" layout={false}>
          {sessions.length > 0 ? (
            sessions.map((s) => (
              <Reorder.Item
                key={s.id}
                value={s}
                className="w-full"
                initial={false}
              >
                {renderSessionCard(s)}
              </Reorder.Item>
            ))
          ) : (
            <div className="px-4 py-8 text-center bg-white/50 rounded-2xl border border-dashed border-gray-200 mt-2">
               <p className="text-sm text-gray-400 font-medium">暫無角色記錄</p>
            </div>
          )}
        </Reorder.Group>
        ) : (
          <ul className="space-y-1">
            {sessions.length > 0 ? (
              sessions.map((s) => (
                <li key={s.id} className="w-full">
                  {renderSessionCard(s)}
                </li>
              ))
            ) : (
              <div className="px-4 py-8 text-center bg-white/50 rounded-2xl border border-dashed border-gray-200 mt-2">
                <p className="text-sm text-gray-400 font-medium">暫無角色記錄</p>
              </div>
            )}
          </ul>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-100/50">
        <button
          onClick={() => navigateTo('settings')}
          className="flex items-center w-full py-3 px-4 text-gray-600 hover:text-gray-900 transition-colors font-bold text-sm rounded-xl hover:bg-gray-200 gap-3"
        >
          <Settings className="w-5 h-5 text-gray-400" />
          系統設置
        </button>
      </div>

    </aside>

      {/* Create Agent Modal - outside aside to center properly */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">{modalMode === 'create' ? '新建智能體' : '智能體修改'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {submitError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">智能體ID <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={newSessionData.id}
                  onChange={e => {
                    // Only allow alphanumeric and dashes/underscores for ID
                    const val = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
                    setNewSessionData(prev => ({...prev, id: val}));
                    setSubmitError(null);
                  }}
                  disabled={modalMode === 'edit'}
                  placeholder="如：translation_agent (不可修改)"
                  autoFocus={modalMode === 'create'}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">智能體名稱 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={newSessionData.name}
                  onChange={e => setNewSessionData(prev => ({...prev, name: e.target.value}))}
                  placeholder="給智能體起個名字，如：翻譯助手"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">獨立模型配置 (選填)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={isModelDropdownOpen ? modelSearchQuery : (newSessionData.model || '')}
                    onChange={e => {
                      setModelSearchQuery(e.target.value);
                      if (!isModelDropdownOpen) setIsModelDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setModelSearchQuery('');
                      setIsModelDropdownOpen(true);
                    }}
                    placeholder={newSessionData.model ? newSessionData.model : '點擊選擇模型 (留空使用默認)'}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-mono text-gray-900 pr-8"
                  />
                  {newSessionData.model && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewSessionData(prev => ({...prev, model: ''}));
                        setModelSearchQuery('');
                        setIsModelDropdownOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all"
                      title="清除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {isModelDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[10]" onClick={() => setIsModelDropdownOpen(false)} />
                    <div className="absolute z-[20] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl max-h-[160px] overflow-y-auto shadow-lg">
                      {availableModels
                        .filter(m => {
                          if (!modelSearchQuery) return true;
                          const q = modelSearchQuery.toLowerCase();
                          return m.id.toLowerCase().includes(q) || (m.alias && m.alias.toLowerCase().includes(q));
                        })
                        .sort((a, b) => {
                          if (a.primary && !b.primary) return -1;
                          if (!a.primary && b.primary) return 1;
                          return a.id.localeCompare(b.id, undefined, { sensitivity: 'base' });
                        })
                        .map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setNewSessionData(prev => ({...prev, model: m.id}));
                              setModelSearchQuery('');
                              setIsModelDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between gap-2 ${
                              newSessionData.model === m.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                          >
                            <span className="font-mono text-xs max-w-[200px] truncate">{m.id}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {m.primary && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 rounded text-blue-600 font-medium">默認</span>}
                            </div>
                          </button>
                        ))
                      }
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex-1 flex flex-col min-h-0 border border-gray-100 rounded-2xl overflow-hidden mt-2 bg-gray-50/30">
                <div className="flex p-1 bg-gray-100/50 gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'soul', name: 'SOUL.md | 人格' },
                    { id: 'user', name: 'USER.md | 用戶' },
                    { id: 'agents', name: 'AGENTS.md | 智能體' },
                    { id: 'tools', name: 'TOOLS.md | 工具' },
                    { id: 'heartbeat', name: 'HEARTBEAT.md | 心跳' },
                    { id: 'identity', name: 'IDENTITY.md | 身份' }
                  ].map(tab => (
                    <button
                      key={tab.id} type="button" onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-none px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
                <div className="flex-1 relative">
                  <textarea 
                    value={newSessionData[`${activeTab}Content` as keyof typeof newSessionData]}
                    onChange={e => setNewSessionData(prev => ({...prev, [`${activeTab}Content`]: e.target.value}))}
                    placeholder={templates[activeTab as keyof typeof templates]}
                    className="w-full h-36 p-4 bg-transparent outline-none transition-all resize-none text-[13px] font-mono text-gray-900 border-0 focus:ring-0 leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all active:scale-[0.98]"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  disabled={!newSessionData.name.trim()}
                  className="flex-1 px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                >
                  {modalMode === 'create' ? '確認創建' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Info Modal */}
      {isInfoModalOpen && viewingSession && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsInfoModalOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">智能體詳情</h3>
                </div>
              </div>
              <button 
                onClick={() => setIsInfoModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">智能體ID</label>
                  <p className="text-sm font-mono text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">{viewingSession.agentId || viewingSession.id}</p>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">智能體名稱</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">{viewingSession.name}</p>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">獨立模型配置</label>
                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 min-h-[46px]">
                    <span className="text-sm font-mono text-gray-900">
                      {viewingSession.model || '未設置 (默認)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={() => handleStartEdit(null, viewingSession)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded-xl font-bold transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                  修改
                </button>
        <button 
                  onClick={(e) => { setIsInfoModalOpen(false); confirmDeleteSession(e, viewingSession.id); }}
                  disabled={viewingSession.id === 'main' || viewingSession.agentId === 'main'}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - outside aside to center properly */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDeleteModalOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-sm overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">刪除智能體</h3>
              <p className="text-sm text-gray-500">
                確定要刪除此智能體嗎？此操作將清空該智能體的所有記錄且不可恢復。
              </p>
            </div>
            <div className="p-4 bg-gray-50 flex gap-3 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl font-semibold transition-all"
              >
                取消
              </button>
              <button 
                type="button" 
                onClick={handleDeleteSession}
                className="flex-1 px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-xl font-semibold transition-all"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
