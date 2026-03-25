import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { Toaster, toast } from 'sonner';
import { 
  Plus, 
  MessageSquare, 
  History, 
  Settings, 
  HelpCircle, 
  Menu, 
  X, 
  Send, 
  Image as ImageIcon, 
  Paperclip, 
  User, 
  Bot,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Square,
  AlertCircle,
  Sun,
  Moon,
  Download
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { ChatSession, Message, Attachment } from './types';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[var(--bg-main)] text-[var(--text-main)] p-6 text-center">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">出错了</h1>
          <p className="text-[var(--text-secondary)] mb-4 max-w-md">
            应用程序遇到了一个意外错误。这可能是由于本地存储已满或网络问题导致的。
          </p>
          <pre className="bg-[var(--bg-sidebar)] p-4 rounded-lg text-xs text-red-400 overflow-auto max-w-full mb-6 border border-[var(--border-color)]">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
          >
            清除缓存并重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const MODELS = [
  { id: "[A渠道][12额度/次]gemini-3.1-pro-preview-maxthinking-search", name: "Gemini 3.1 Pro Search (0.1元/条)", desc: "12额度 | MaxThinking | Search" },
  { id: "[A渠道][1额度/次]gemini-3-flash-preview-maxthinking", name: "Gemini 3 Flash Max (0.008元/条)", desc: "1额度 | MaxThinking" },
  { id: "[A渠道][2额度/次][抗截断]gemini-3-flash-preview-maxthinking", name: "Gemini 3 Flash (抗截断) (0.1元/条)", desc: "2额度 | 抗截断" },
];

// ==========================================
// 默认配置 (Default Configuration)
// ==========================================
// 如果您想让别人直接使用您的 API 密钥，请在此修改默认值。
// 注意：硬编码 API 密钥在前端代码中是不安全的，请仅在受信任的环境中使用。
const DEFAULT_BASE_URL = "https://new.xiaweiliang.cn/v1";
const DEFAULT_API_KEY = "sk-vU5dTGQDuUVDxoqI2E8tYOyQfG5a8tpEWEoe3csyQ9VNMmVB";
// ==========================================

export default function App() {
  return (
    <ErrorBoundary>
      <ChatApp />
    </ErrorBoundary>
  );
}

function ChatApp() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('gemini_base_url') || DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string; progress: number }[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>(localStorage.getItem('theme') as 'dark' | 'light' || 'dark');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gemini_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gemini_sessions', JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to save sessions to localStorage", e);
    }
  }, [sessions]);

  // Handle theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentSession?.messages, isLoading]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '新对话',
      messages: [],
      updatedAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setAttachments([]);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
      setCurrentSessionId(newSessions.length > 0 ? newSessions[0].id : null);
    }
  };

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`文件 ${file.name} 太大`, {
          description: '请上传小于 5MB 的文件。',
          position: 'top-center',
        });
        return;
      }
      const fileId = Math.random().toString(36).substring(7);
      setUploadingFiles(prev => [...prev, { id: fileId, name: file.name, progress: 0 }]);

      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress } : f));
        }
      };

      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        
        // If it's an image, try to compress it if it's too large
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.src = base64;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Max dimensions for LLM vision (usually 1024 is plenty for most models)
            const MAX_SIZE = 1024;
            if (width > MAX_SIZE || height > MAX_SIZE) {
              if (width > height) {
                height = Math.round((height * MAX_SIZE) / width);
                width = MAX_SIZE;
              } else {
                width = Math.round((width * MAX_SIZE) / height);
                height = MAX_SIZE;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Compress to JPEG with 0.7 quality
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            const newAttachment: Attachment = {
              name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
              type: 'image/jpeg',
              data: compressedBase64.split(',')[1],
              url: compressedBase64
            };
            setAttachments(prev => [...prev, newAttachment]);
            setTimeout(() => {
              setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
            }, 500);
          };
        } else {
          const newAttachment: Attachment = {
            name: file.name,
            type: file.type,
            data: base64.split(',')[1],
            url: base64
          };
          setAttachments(prev => [...prev, newAttachment]);
          setTimeout(() => {
            setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
          }, 500);
        }
      };

      reader.onerror = () => {
        console.error("File reading failed");
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      };

      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const stopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const exportSession = (session: ChatSession) => {
    if (!session || session.messages.length === 0) {
      toast.error("没有可导出的消息");
      return;
    }

    let markdown = `# ${session.title}\n\n`;
    markdown += `导出日期: ${new Date().toLocaleString()}\n\n---\n\n`;

    session.messages.forEach(msg => {
      const role = msg.role === 'user' ? '您' : 'Gemini';
      const time = format(msg.timestamp, 'yyyy-MM-dd HH:mm:ss');
      markdown += `### ${role} (${time})\n\n${msg.content}\n\n`;
      
      if (msg.attachments && msg.attachments.length > 0) {
        markdown += `*附件: ${msg.attachments.map(a => a.name).join(', ')}*\n\n`;
      }
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("聊天记录已导出为 Markdown 文件");
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: input.slice(0, 30) || '新对话',
        messages: [],
        updatedAt: Date.now()
      };
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      sessionId = newSession.id;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };

    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, messages: [...s.messages, userMessage], updatedAt: Date.now(), title: s.messages.length === 0 ? input.slice(0, 30) || '新对话' : s.title }
        : s
    ));

    setInput('');
    setAttachments([]);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Prepare messages for OpenAI format (proxy server expects this)
      const systemMessage = { role: 'system', content: "你是一个极其专业的助手。请详尽、有逻辑地回答问题，不要偷懒。" };
      const history = currentSession?.messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })) || [];

      // Handle attachments by appending to content or using vision format
      const promptWithSuffix = input + " (请详细回复，字数多一点)";
      let finalContent: any = promptWithSuffix;
      if (attachments.length > 0) {
        finalContent = [
          { type: "text", text: promptWithSuffix },
          ...attachments.map(att => ({
            type: "image_url",
            image_url: { url: att.url }
          }))
        ];
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: selectedModel,
          baseUrl: baseUrl,
          apiKey: apiKey,
          messages: [systemMessage, ...history, { role: "user", content: finalContent }]
        })
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(text);
        } catch (e) {
          console.error("Non-JSON error response from server:", text);
          if (text.includes("<!doctype html>") || text.includes("<html>")) {
            throw new Error(`服务器返回了 HTML 页面而非 JSON (状态码: ${response.status})。这通常意味着 API 路由未正确匹配或服务器正在重启。请稍后重试。`);
          }
          throw new Error(`服务器返回了非 JSON 响应 (状态码: ${response.status})。内容: ${text.slice(0, 100)}...`);
        }
        throw new Error(errorData.error || `服务器错误: ${response.status}`);
      }
      
      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content || "抱歉，我无法生成回复。";

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: aiContent,
        timestamp: Date.now()
      };

      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, messages: [...s.messages, aiMessage], updatedAt: Date.now() }
          : s
      ));
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      console.error("Gemini API Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `发生错误: ${error.message}`,
        timestamp: Date.now()
      };
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, messages: [...s.messages, errorMessage], updatedAt: Date.now() }
          : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans selection:bg-[#3d3d3d]">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-[var(--bg-sidebar)] flex flex-col overflow-hidden border-r border-[var(--border-color)] z-20"
      >
        <div className="p-4">
          <button 
            onClick={createNewSession}
            className="flex items-center gap-3 w-full p-3 rounded-full bg-[var(--bg-hover)] hover:bg-[var(--border-color)] transition-colors text-sm font-medium mb-4"
          >
            <Plus size={20} />
            <span>新对话</span>
          </button>

          <div className="space-y-2">
            <div className="px-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">模型选择</div>
            <div className="space-y-1">
              {MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={cn(
                    "w-full text-left p-2 rounded-lg text-xs transition-all border",
                    selectedModel === m.id 
                      ? "bg-blue-600/10 border-blue-500/50 text-blue-400" 
                      : "bg-[var(--bg-hover)] border-transparent text-[var(--text-main)] hover:bg-[var(--border-color)]"
                  )}
                >
                  <div className="font-medium truncate">{m.name}</div>
                  <div className="text-[9px] opacity-60 truncate">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="px-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">API 密钥 (API Key)</div>
            <input 
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                localStorage.setItem('gemini_api_key', e.target.value);
              }}
              placeholder="sk-..."
              className="w-full bg-[var(--bg-hover)] border border-transparent focus:border-[var(--text-secondary)] rounded-lg p-2 text-xs text-[var(--text-main)] outline-none"
            />
          </div>

          <div className="space-y-2 mt-4">
            <div className="px-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">接口地址 (Base URL)</div>
            <input 
              type="text"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                localStorage.setItem('gemini_base_url', e.target.value);
              }}
              placeholder="https://new.xiaweiliang.cn/v1"
              className="w-full bg-[var(--bg-hover)] border border-transparent focus:border-[var(--text-secondary)] rounded-lg p-2 text-xs text-[var(--text-main)] outline-none"
            />
            <div className="flex gap-2 mt-1 px-2">
              <button 
                onClick={() => {
                  setBaseUrl(DEFAULT_BASE_URL);
                  setApiKey(DEFAULT_API_KEY);
                  localStorage.setItem('gemini_base_url', DEFAULT_BASE_URL);
                  localStorage.setItem('gemini_api_key', DEFAULT_API_KEY);
                }}
                className="text-[9px] text-blue-400 hover:underline"
              >
                恢复默认设置
              </button>
            </div>
            <p className="px-2 text-[9px] text-[var(--text-secondary)]">
              如果您购买的 API 需要特定中转地址，请在此修改。
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
          <div className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">最近</div>
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}
              className={cn(
                "group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors text-sm",
                currentSessionId === session.id ? "bg-[var(--border-color)] text-[var(--text-main)]" : "hover:bg-[var(--bg-hover)] text-[var(--text-main)]"
              )}
            >
              <MessageSquare size={16} className="shrink-0" />
              <span className="truncate flex-1">{session.title}</span>
              <button 
                onClick={(e) => deleteSession(session.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--bg-hover)] rounded transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--border-color)] space-y-1">
          <button 
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[var(--bg-hover)] text-sm text-[var(--text-main)]"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === 'dark' ? '白天模式' : '夜间模式'}</span>
          </button>
          <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[var(--bg-hover)] text-sm text-[var(--text-main)]">
            <HelpCircle size={18} />
            <span>帮助</span>
          </button>
          <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[var(--bg-hover)] text-sm text-[var(--text-main)]">
            <History size={18} />
            <span>活动</span>
          </button>
          <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[var(--bg-hover)] text-sm text-[var(--text-main)]">
            <Settings size={18} />
            <span>设置</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-medium tracking-tight">Gemini</h1>
          </div>
          <div className="flex items-center gap-2">
            {currentSession && currentSession.messages.length > 0 && (
              <button 
                onClick={() => exportSession(currentSession)}
                className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                title="导出聊天记录"
              >
                <Download size={20} />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
              U
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-0"
        >
          {!currentSession || currentSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto text-center space-y-8">
              <h2 className="text-4xl md:text-5xl font-medium bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 bg-clip-text text-transparent py-2">
                你好，今天我能帮你做些什么？
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-4">
                {[
                  "帮我写一封专业的邮件",
                  "用通俗易懂的方式解释量子物理",
                  "制定一个为期3天的东京旅行计划",
                  "写一个用于数据分析的 Python 脚本"
                ].map((suggestion, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="p-4 rounded-2xl bg-[var(--bg-sidebar)] hover:bg-[var(--bg-hover)] text-left text-sm transition-all border border-transparent hover:border-[var(--border-color)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-8 space-y-8">
              {currentSession.messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex gap-4 group",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === 'user' ? "bg-blue-600" : "bg-transparent"
                  )}>
                    {msg.role === 'user' ? <User size={18} /> : <Bot size={24} className="text-blue-400" />}
                  </div>
                  <div className={cn(
                    "flex flex-col max-w-[85%] space-y-2",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {msg.attachments.map((att, i) => (
                          <div key={i} className="relative rounded-xl overflow-hidden border border-[var(--border-color)]">
                            {att.type.startsWith('image/') ? (
                              <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[200px] object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="p-3 bg-[var(--bg-sidebar)] flex items-center gap-2 text-xs">
                                <Paperclip size={14} />
                                <span>{att.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={cn(
                      "rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
                      msg.role === 'user' ? "bg-[var(--message-user)] text-[var(--text-main)]" : "bg-transparent text-[var(--text-main)]"
                    )}>
                      <div className={cn(
                        "prose max-w-none prose-p:leading-relaxed prose-pre:bg-[var(--bg-main)] prose-pre:border prose-pre:border-[var(--border-color)]",
                        theme === 'dark' ? "prose-invert" : "prose-slate"
                      )}>
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity">
                      {format(msg.timestamp, 'HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
                    <Bot size={24} className="text-[var(--text-secondary)]" />
                  </div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-2 bg-[var(--bg-hover)] rounded w-3/4"></div>
                    <div className="h-2 bg-[var(--bg-hover)] rounded w-1/2"></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:pb-8">
          <div className="max-w-3xl mx-auto relative">
            {/* Uploading Progress */}
            <AnimatePresence>
              {uploadingFiles.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 right-0 mb-4 space-y-2 p-3 bg-[#1e1f20] rounded-2xl border border-[#333] shadow-xl z-30"
                >
                  <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest px-1 mb-1">正在处理文件...</div>
                  {uploadingFiles.map(file => (
                    <div key={file.id} className="space-y-1">
                      <div className="flex justify-between text-[11px] px-1">
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <span>{file.progress}%</span>
                      </div>
                      <div className="h-1 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${file.progress}%` }}
                          className="h-full bg-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attachment Previews */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 right-0 mb-4 flex flex-wrap gap-2 p-2 bg-[var(--bg-sidebar)] rounded-2xl border border-[var(--border-color)] shadow-xl"
                >
                  {attachments.map((att, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-[var(--border-color)]">
                      {att.type.startsWith('image/') ? (
                        <img src={att.url} alt="preview" className="w-16 h-16 object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-16 h-16 bg-[var(--bg-hover)] flex items-center justify-center">
                          <Paperclip size={20} />
                        </div>
                      )}
                      <button 
                        onClick={() => removeAttachment(i)}
                        className="absolute top-0 right-0 p-1 bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div 
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="bg-[var(--bg-input)] rounded-[28px] p-2 pl-6 flex items-end gap-2 border border-transparent focus-within:border-[var(--border-color)] transition-all"
            >
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="在此输入提示词"
                rows={1}
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 text-[16px] max-h-[200px] custom-scrollbar text-[var(--text-main)]"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
              <div className="flex items-center gap-1 pb-1 pr-1">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  multiple 
                  className="hidden" 
                  accept="image/*,.pdf,.txt,.doc,.docx"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 hover:bg-[var(--bg-hover)] rounded-full text-[var(--text-secondary)] transition-colors"
                  title="上传图片或文件"
                >
                  <ImageIcon size={20} />
                </button>
                {isLoading ? (
                  <button 
                    onClick={stopResponse}
                    className="p-3 rounded-full text-white bg-[#444] hover:bg-[#555] transition-all"
                    title="中止回答"
                  >
                    <Square size={16} fill="white" />
                  </button>
                ) : (
                  <button 
                    onClick={sendMessage}
                    disabled={(!input.trim() && attachments.length === 0) || isLoading}
                    className={cn(
                      "p-3 rounded-full transition-all",
                      (!input.trim() && attachments.length === 0) || isLoading
                        ? "text-[#444] cursor-not-allowed"
                        : "text-blue-400 hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    <Send size={20} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] text-center mt-3 px-4">
              Gemini 可能会显示不准确的信息（包括关于人物的信息），因此请核实其回答。 
              <a href="#" className="underline ml-1">您的隐私与 Gemini 应用</a>
            </p>
          </div>
        </div>
      </main>

      <Toaster theme={theme} richColors closeButton />

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
        
        /* Markdown Styles */
        .prose pre {
          padding: 1rem;
          border-radius: 0.75rem;
          margin: 1rem 0;
          overflow-x: auto;
        }
        .prose code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.9em;
          color: #8ab4f8;
        }
        .prose p {
          margin-bottom: 1rem;
        }
        .prose ul, .prose ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .prose li {
          margin-bottom: 0.5rem;
        }
      `}} />
    </div>
  );
}
