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
  Download,
  ArrowLeft,
  Search,
  Calculator,
  ChevronDown,
  Info,
  FileText,
  FileUp,
  FileDown,
  FileCheck,
  FileWarning,
  Loader2,
  Edit2,
  Type,
  ShieldCheck,
  Eye,
  RefreshCw,
  Maximize2,
  Minimize2,
  Layers
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { ChatSession, Message, Attachment } from './types';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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

// CAD Text Extraction Helper
// CAD Viewer Modal for Chat
const MODELS = [
  { id: "[A渠道][1额度/次]gemini-3-flash-preview-maxthinking", name: "Gemini 3 Flash Max (0.008元/条)", desc: "1额度 | MaxThinking" },
  { id: "[A渠道][2额度/次][抗截断]gemini-3-flash-preview-maxthinking", name: "Gemini 3 Flash (抗截断) (0.1元/条)", desc: "2额度 | 抗截断" },
  { id: "[A渠道][12额度/次]gemini-3.1-pro-preview-maxthinking-search", name: "Gemini 3.1 Pro Search (0.1元/条)", desc: "12额度 | MaxThinking | Search" },
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
  const [view, setView] = useState<'hub' | 'chat' | 'cost_engineer_ai'>('hub');
  const [theme, setTheme] = useState<'dark' | 'light'>(localStorage.getItem('theme') as 'dark' | 'light' || 'dark');
  const [fontSize, setFontSize] = useState<number>(Number(localStorage.getItem('font_size')) || 16);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('gemini_selected_model') || MODELS[0].id);
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('gemini_base_url') || DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY);
  const [customModels, setCustomModels] = useState<{id: string, name: string, desc: string}[]>(() => {
    const saved = localStorage.getItem('custom_models');
    return saved ? JSON.parse(saved) : [];
  });

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

  useEffect(() => {
    localStorage.setItem('font_size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('custom_models', JSON.stringify(customModels));
  }, [customModels]);

  const allModels = [...MODELS, ...customModels];

  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        {view === 'hub' ? (
          <motion.div
            key="hub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Hub 
              onSelectChat={() => setView('chat')} 
              onSelectCostAI={() => setView('cost_engineer_ai')}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          </motion.div>
        ) : view === 'chat' ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-screen"
          >
            <ChatApp 
              onBack={() => setView('hub')} 
              theme={theme} 
              toggleTheme={toggleTheme} 
              fontSize={fontSize}
              setFontSize={setFontSize}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              baseUrl={baseUrl}
              setBaseUrl={setBaseUrl}
              apiKey={apiKey}
              setApiKey={setApiKey}
              customModels={customModels}
              setCustomModels={setCustomModels}
              allModels={allModels}
            />
          </motion.div>
        ) : view === 'cost_engineer_ai' ? (
          <motion.div
            key="cost_engineer_ai"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-screen"
          >
            <CostEngineerAI 
              onBack={() => setView('hub')} 
              theme={theme} 
              toggleTheme={toggleTheme} 
              fontSize={fontSize}
              setFontSize={setFontSize}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              baseUrl={baseUrl}
              setBaseUrl={setBaseUrl}
              apiKey={apiKey}
              setApiKey={setApiKey}
              customModels={customModels}
              setCustomModels={setCustomModels}
              allModels={allModels}
            />
          </motion.div>
        ) : (
          <div />
        )}
      </AnimatePresence>
      
      <Toaster position="top-center" richColors />
    </ErrorBoundary>
  );
}

function Hub({ onSelectChat, onSelectCostAI, theme, toggleTheme }: { onSelectChat: () => void; onSelectCostAI: () => void; theme: 'dark' | 'light'; toggleTheme: () => void }) {
  const tools = [
    {
      id: 'chat',
      title: 'AI 对话',
      description: '基于 Gemini 的智能对话助手，支持文本、图片、文件分析。',
      icon: <MessageSquare className="w-8 h-8 text-blue-500" />,
      active: true,
      onClick: onSelectChat
    },
    {
      id: 'cost_ai',
      title: '造价签证助手',
      description: '专业处理工程签证、工作联系单文字描述，语气官方且严谨。',
      icon: <Calculator className="w-8 h-8 text-red-500" />,
      active: true,
      onClick: onSelectCostAI
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] p-8 flex flex-col items-center overflow-y-auto relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      
      {/* Theme Toggle */}
      <div className="absolute top-0 right-0 p-8">
        <button 
          onClick={toggleTheme}
          className="p-3 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-main)] hover:bg-[var(--bg-hover)] transition-all shadow-lg"
          title={theme === 'dark' ? '切换到白天模式' : '切换到夜间模式'}
        >
          {theme === 'dark' ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-blue-400" />}
        </button>
      </div>
      
      <header className="mb-12 text-center mt-12 relative">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-block p-5 rounded-[2.5rem] bg-gradient-to-br from-blue-500/20 to-purple-500/20 mb-8 shadow-xl shadow-blue-500/5"
        >
          <Bot className="w-16 h-16 text-blue-500" />
        </motion.div>
        <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
          AI 智能工作台
        </h1>
        <p className="text-[var(--text-muted)] text-xl font-light tracking-wide">探索人工智能的无限边界</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {tools.map((tool, index) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
            whileHover={tool.active ? { scale: 1.03, y: -8 } : {}}
            whileTap={tool.active ? { scale: 0.98 } : {}}
            onClick={tool.active ? tool.onClick : undefined}
            className={cn(
              "p-10 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm transition-all relative overflow-hidden group",
              tool.active ? "cursor-pointer hover:shadow-2xl hover:border-blue-500/40 hover:bg-[var(--bg-secondary)]" : "opacity-60 grayscale cursor-not-allowed"
            )}
          >
            {tool.active && (
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <ChevronRight className="w-8 h-8 text-blue-500" />
              </div>
            )}
            <div className="mb-8 p-5 rounded-2xl bg-[var(--bg-main)] w-fit shadow-inner group-hover:scale-110 transition-transform">
              {tool.icon}
            </div>
            <h3 className="text-3xl font-bold mb-4 flex items-center gap-3">
              {tool.title}
              {!tool.active && (
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border-main)] uppercase tracking-widest">
                  敬请期待
                </span>
              )}
            </h3>
            <p className="text-[var(--text-muted)] text-lg leading-relaxed font-light">
              {tool.description}
            </p>
            
            {/* Subtle hover glow */}
            {tool.active && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
          </motion.div>
        ))}
      </div>
      
      <footer className="mt-auto pt-24 pb-12 text-[var(--text-muted)] text-sm flex flex-col items-center gap-4">
        <div className="flex gap-8 mb-2 font-medium">
          <span className="hover:text-blue-500 transition-colors cursor-pointer">关于我们</span>
          <span className="hover:text-blue-500 transition-colors cursor-pointer">服务条款</span>
          <span className="hover:text-blue-500 transition-colors cursor-pointer">隐私政策</span>
        </div>
        <div className="h-px w-12 bg-[var(--border-main)]" />
        <p className="tracking-widest uppercase text-[10px] font-bold">© 2026 AI 智能工作台 | 探索 AI 的无限可能</p>
      </footer>
    </div>
  );
}






      
      






function CostEngineerAI({ 
  onBack, theme, toggleTheme, fontSize, setFontSize,
  selectedModel, setSelectedModel, baseUrl, setBaseUrl, apiKey, setApiKey,
  customModels, setCustomModels, allModels
}: { 
  onBack: () => void; theme: 'dark' | 'light'; toggleTheme: () => void; fontSize: number; setFontSize: (s: number) => void;
  selectedModel: string; setSelectedModel: (s: string) => void; baseUrl: string; setBaseUrl: (s: string) => void; apiKey: string; setApiKey: (s: string) => void;
  customModels: {id: string, name: string, desc: string}[];
  setCustomModels: React.Dispatch<React.SetStateAction<{id: string, name: string, desc: string}[]>>;
  allModels: {id: string, name: string, desc: string}[];
}) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('cost_ai_sessions');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem('cost_ai_sessions');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed[0].id : null;
    } catch (e) {
      return null;
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string; progress: number }[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [newModelId, setNewModelId] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    localStorage.setItem('cost_ai_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, currentSessionId]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '新签证对话',
      messages: [],
      updatedAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) setCurrentSessionId(null);
  };

  const startEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const saveTitle = (id: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitle || '未命名对话' } : s));
    setEditingSessionId(null);
  };

  const processFiles = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} 超过 10MB 限制`);
        continue;
      }
      const fileId = Math.random().toString(36).substring(7);
      setUploadingFiles(prev => [...prev, { id: fileId, name: file.name, progress: 0 }]);

      try {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const img = new Image();
            img.src = base64;
            img.onerror = () => {
              setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
              toast.error(`无法加载图片: ${file.name}`);
            };
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
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
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
              const newAttachment: Attachment = {
                name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                type: 'image/jpeg',
                data: compressedBase64.split(',')[1],
                url: compressedBase64
              };
              setAttachments(prev => [...prev, newAttachment]);
              setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
            };
          };
          reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = "";
          for (let j = 1; j <= pdf.numPages; j++) {
            const page = await pdf.getPage(j);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + "\n";
            setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: Math.round((j / pdf.numPages) * 100) } : f));
          }
          const newAttachment: Attachment = {
            name: file.name,
            type: 'text/plain',
            data: btoa(unescape(encodeURIComponent(fullText))),
            url: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(fullText)))}`,
            extractedText: fullText
          };
          setAttachments(prev => [...prev, newAttachment]);
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        } else if (file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value;
          const newAttachment: Attachment = {
            name: file.name,
            type: 'text/plain',
            data: btoa(unescape(encodeURIComponent(text))),
            url: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(text)))}`,
            extractedText: text
          };
          setAttachments(prev => [...prev, newAttachment]);
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          const text = await file.text();
          const newAttachment: Attachment = {
            name: file.name,
            type: 'text/plain',
            data: btoa(unescape(encodeURIComponent(text))),
            url: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(text)))}`,
            extractedText: text
          };
          setAttachments(prev => [...prev, newAttachment]);
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        } else {
          toast.error(`不支持的文件类型: ${file.name}`);
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        }
      } catch (error) {
        console.error(error);
        toast.error(`处理文件失败: ${file.name}`);
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      }
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
      const role = msg.role === 'user' ? '您' : 'AI 助手';
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
    if (isLoading) {
      toast.warning("AI 正在思考中，请稍候...");
      return;
    }
    if (!input.trim() && attachments.length === 0) {
      toast.warning("请输入内容或上传附件");
      return;
    }
    
    console.log("CostEngineerAI: sendMessage triggered");
    const currentInput = input;
    const currentAttachments = [...attachments];
    let sessionId = currentSessionId;
    
    const currentSession = sessions.find(s => s.id === sessionId);
    const history = currentSession ? currentSession.messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    })) : [];

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: Date.now(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined
    };

    if (!sessionId) {
      const newSessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: newSessionId,
        title: currentInput.slice(0, 30) || '新签证对话',
        messages: [userMessage],
        updatedAt: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSessionId);
      sessionId = newSessionId;
    } else {
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { 
              ...s, 
              messages: [...s.messages, userMessage], 
              updatedAt: Date.now(),
              title: s.messages.length === 0 ? currentInput.slice(0, 30) || '新签证对话' : s.title 
            }
          : s
      ));
    }

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setAttachments([]);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const systemMessage = { 
        role: 'system', 
        content: `你是一个极其专业的建筑工程造价专家，擅长编写工程签证、工作联系单、技术核定单等文字描述。
你的任务是根据用户提供的事件描述，生成语气官方、逻辑严谨、符合我国现行法律法规（如《建设工程工程量清单计价规范》、相关合同法等）的专业描述。
你的目标是让审计人员在审计时找不到漏洞，最大程度地保护施工单位的合法利益。
输出格式应包含：
1. 事件背景
2. 签证/联系单事由（引用合同条款或规范）
3. 具体内容描述（专业术语准确）
4. 结论与建议
请确保语气客观、专业，避免口语化。` 
      };
      
      let finalContent: any = currentInput;
      const textAttachments = currentAttachments.filter(a => a.extractedText);
      if (textAttachments.length > 0) {
        const extraText = textAttachments.map(a => `\n\n--- 参考文件: ${a.name} ---\n${a.extractedText}`).join('');
        finalContent = currentInput + extraText;
      }

      const imageAttachments = currentAttachments.filter(a => a.type.startsWith('image/'));
      if (imageAttachments.length > 0) {
        finalContent = [
          { type: "text", text: typeof finalContent === 'string' ? finalContent : currentInput },
          ...imageAttachments.map(att => ({
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
          if (response.status === 504) {
            throw new Error("请求超时 (504)：模型思考时间过长。建议切换到更快的模型。");
          }
          throw new Error(`服务器错误: ${response.status}`);
        }
        throw new Error(errorData.error || `服务器错误: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";
      const aiMessageId = (Date.now() + 2).toString();
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, messages: [...s.messages, { id: aiMessageId, role: 'model', content: "", timestamp: Date.now() }], updatedAt: Date.now() }
          : s
      ));

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
            const dataStr = trimmedLine.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices?.[0]?.delta?.content || "";
              if (content) {
                aiContent += content;
                setSessions(prev => prev.map(s => 
                  s.id === sessionId 
                    ? { ...s, messages: s.messages.map(m => m.id === aiMessageId ? { ...m, content: aiContent } : m) }
                    : s
                ));
              }
            } catch (e) {}
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Gemini API Error:", error);
      const errorMsg = error.message.includes('internal error')
        ? '网络连接失败 (Internal Error)。这通常是由于 API 地址错误或服务器无法访问导致的。请检查您的接口地址 (Base URL) 是否正确，并尝试点击“恢复默认设置”。'
        : (error.message === 'Failed to fetch' 
          ? '网络连接失败 (Failed to fetch)。请检查您的网络连接，或确保 API 地址 (Base URL) 正确且可访问。' 
          : error.message);
      toast.error(`发送失败: ${errorMsg}`);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans">
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-[var(--bg-sidebar)] flex flex-col overflow-hidden border-r border-[var(--border-color)] z-20"
      >
        <div className="p-4 flex flex-col h-full">
          <button 
            onClick={createNewSession}
            className="flex items-center gap-3 w-full p-3 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-sm font-bold mb-4 border border-red-500/20"
          >
            <Plus size={20} />
            <span>新建签证对话</span>
          </button>

          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
            <div className="px-4 py-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">签证列表</div>
            {sessions.map(session => (
              <div 
                key={session.id}
                onClick={() => setCurrentSessionId(session.id)}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all text-sm relative",
                  currentSessionId === session.id ? "bg-red-500/10 text-red-500 border border-red-500/20" : "hover:bg-[var(--bg-hover)] text-[var(--text-main)]"
                )}
              >
                <FileText size={16} className="shrink-0" />
                {editingSessionId === session.id ? (
                  <input 
                    autoFocus
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => saveTitle(session.id)}
                    onKeyDown={e => e.key === 'Enter' && saveTitle(session.id)}
                    className="bg-transparent outline-none w-full"
                  />
                ) : (
                  <span className="truncate flex-1">{session.title}</span>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => startEditing(session, e)} className="p-1 hover:bg-red-500/10 rounded"><Edit2 size={12} /></button>
                  <button onClick={(e) => deleteSession(session.id, e)} className="p-1 hover:bg-red-500/10 rounded"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[var(--border-color)] space-y-4">
            <div className="space-y-2">
              <div className="px-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">模型选择</div>
              <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                {allModels.map(m => (
                  <div key={m.id} className="relative group/model">
                    <button
                      onClick={() => {
                        setSelectedModel(m.id);
                        localStorage.setItem('gemini_selected_model', m.id);
                      }}
                      className={cn(
                        "w-full text-left p-2 rounded-lg text-xs transition-all border pr-8",
                        selectedModel === m.id 
                          ? "bg-red-600/10 border-red-500/50 text-red-400" 
                          : "bg-[var(--bg-hover)] border-transparent text-[var(--text-main)] hover:bg-[var(--border-color)]"
                      )}
                    >
                      <div className="font-medium truncate">{m.name}</div>
                    </button>
                    {customModels.some(cm => cm.id === m.id) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomModels(prev => prev.filter(cm => cm.id !== m.id));
                          if (selectedModel === m.id) setSelectedModel(MODELS[0].id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-red-400 opacity-0 group-hover/model:opacity-100 hover:bg-red-500/10 rounded transition-all"
                        title="删除自定义模型"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="px-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">添加自定义模型</div>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  placeholder="输入模型 ID"
                  className="flex-1 bg-[var(--bg-hover)] border border-transparent focus:border-red-500/50 rounded-lg p-2 text-[10px] text-[var(--text-main)] outline-none"
                />
                <button 
                  onClick={() => {
                    if (!newModelId.trim()) return;
                    if (allModels.some(m => m.id === newModelId.trim())) {
                      toast.error("该模型已存在");
                      return;
                    }
                    const nameMatch = newModelId.match(/\]([^\]]+)$/);
                    const name = nameMatch ? nameMatch[1] : newModelId.slice(-15);
                    setCustomModels(prev => [...prev, { 
                      id: newModelId.trim(), 
                      name: name, 
                      desc: "自定义模型" 
                    }]);
                    setNewModelId('');
                    toast.success("模型添加成功");
                  }}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="px-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">API 密钥</div>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  localStorage.setItem('gemini_api_key', e.target.value);
                }}
                placeholder="sk-..."
                className="w-full bg-[var(--bg-hover)] border border-transparent focus:border-red-500/50 rounded-lg p-2 text-xs text-[var(--text-main)] outline-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">字体大小</span>
                <span className="text-[10px] font-mono">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-2 px-2">
                <button onClick={() => setFontSize(Math.max(12, fontSize - 1))} className="p-1 hover:bg-[var(--bg-hover)] rounded"><Type size={14} className="scale-75" /></button>
                <input 
                  type="range" min="12" max="24" step="1" 
                  value={fontSize} 
                  onChange={e => setFontSize(Number(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <button onClick={() => setFontSize(Math.min(24, fontSize + 1))} className="p-1 hover:bg-[var(--bg-hover)] rounded"><Type size={18} /></button>
              </div>
            </div>

            <button 
              onClick={() => {
                toast.info("造价助手说明", {
                  description: (
                    <div className="space-y-2 text-xs">
                      <p>1. <strong>专业生成</strong>: AI 将根据您的描述生成符合规范的签证和联系单文字。</p>
                      <p>2. <strong>附件支持</strong>: 您可以上传现场照片、合同样本或图纸，AI 会结合附件内容进行分析。</p>
                      <p>3. <strong>法律合规</strong>: 生成内容将引用相关合同条款和计价规范，提高审计通过率。</p>
                      <p>4. <strong>免费限制</strong>: 免费版 Gemini API 每天约有 1500 次请求限制。</p>
                    </div>
                  ),
                  duration: 10000
                });
              }}
              className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[var(--bg-hover)] text-sm text-[var(--text-main)]"
            >
              <HelpCircle size={18} />
              <span>帮助</span>
            </button>

            <button onClick={onBack} className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[var(--bg-hover)] text-sm text-[var(--text-main)]">
              <ArrowLeft size={18} />
              <span>返回主页</span>
            </button>
          </div>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-colors">
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck size={16} className="text-red-500" />
                造价工程签证助手
              </h1>
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">专业 · 合规 · 高效</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => currentSession && exportSession(currentSession)}
              disabled={!currentSession || currentSession.messages.length === 0}
              className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-colors text-[var(--text-secondary)] disabled:opacity-30"
              title="导出记录"
            >
              <Download size={20} />
            </button>
            <div className="h-4 w-[1px] bg-[var(--border-color)] mx-1" />
            <div className="px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-500 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              AI 智能模式
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          {!currentSession || currentSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-6">
              <div className="p-6 rounded-[2.5rem] bg-red-500/10"><Calculator size={64} className="text-red-500" /></div>
              <h2 className="text-3xl font-bold">专业造价签证生成</h2>
              <p className="text-[var(--text-muted)] leading-relaxed">
                请描述您的签证事件，例如：<br />
                <span className="italic">"由于甲方要求，将原设计的普通地砖更换为 800x800 的大理石纹抛光砖，增加了人工铺贴难度和材料成本。"</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-left text-sm">
                  <h4 className="font-bold mb-2 text-red-500">语气官方</h4>
                  <p className="text-[var(--text-muted)]">自动转换口语为专业工程术语，逻辑清晰，审计难砍价。</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-left text-sm">
                  <h4 className="font-bold mb-2 text-red-500">法律合规</h4>
                  <p className="text-[var(--text-muted)]">结合现行计价规范，引用合同条款，增强签证说服力。</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8">
              {currentSession.messages.map(msg => (
                <div key={msg.id} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[85%] p-4 rounded-2xl shadow-sm",
                    msg.role === 'user' ? "bg-red-500 text-white" : "bg-[var(--bg-secondary)] border border-[var(--border-color)]"
                  )} style={{ fontSize: `${fontSize}px` }}>
                    <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.attachments && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/20 pt-2">
                        {msg.attachments.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] bg-black/10 px-2 py-1 rounded">
                            <div className="flex items-center gap-1">
                              <Paperclip size={10} /> {a.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] mt-1 px-2">{format(msg.timestamp, 'HH:mm')}</span>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-red-500" />
                    <span className="text-sm">正在生成专业描述...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]">
          <div className="max-w-4xl mx-auto space-y-4">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-full border border-[var(--border-color)] text-xs">
                    <Paperclip size={14} className="text-red-500" />
                    <span className="truncate max-w-[100px]">{file.name}</span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="relative flex items-end gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-2xl border border-[var(--border-color)] transition-all text-[var(--text-secondary)] hover:text-red-500"
              >
                <Paperclip size={20} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => e.target.files && processFiles(e.target.files)} />
              
              <div className="flex-1 relative">
                <textarea 
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="在此描述您的签证事件，AI 将为您生成专业描述..."
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-red-500/50 rounded-2xl p-4 pr-12 outline-none transition-all resize-none min-h-[60px] max-h-[200px]"
                  rows={1}
                />
                <button 
                  onClick={sendMessage}
                  disabled={isLoading || (!input.trim() && attachments.length === 0)}
                  className="absolute right-2 bottom-2 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ChatApp({ 
  onBack, theme, toggleTheme, fontSize, setFontSize,
  selectedModel, setSelectedModel, baseUrl, setBaseUrl, apiKey, setApiKey,
  customModels, setCustomModels, allModels
}: { 
  onBack: () => void; theme: 'dark' | 'light'; toggleTheme: () => void; fontSize: number; setFontSize: (s: number) => void;
  selectedModel: string; setSelectedModel: (s: string) => void; baseUrl: string; setBaseUrl: (s: string) => void; apiKey: string; setApiKey: (s: string) => void;
  customModels: {id: string, name: string, desc: string}[];
  setCustomModels: React.Dispatch<React.SetStateAction<{id: string, name: string, desc: string}[]>>;
  allModels: {id: string, name: string, desc: string}[];
}) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('gemini_sessions');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem('gemini_sessions');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed[0].id : null;
    } catch (e) {
      return null;
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [newModelId, setNewModelId] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gemini_sessions', JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to save sessions to localStorage", e);
    }
  }, [sessions]);

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
    Array.from(files).forEach(async file => {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`文件 ${file.name} 太大`, {
          description: '请上传小于 10MB 的文件。',
          position: 'top-center',
        });
        return;
      }
      const fileId = Math.random().toString(36).substring(7);
      setUploadingFiles(prev => [...prev, { id: fileId, name: file.name, progress: 0 }]);

      try {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const img = new Image();
            img.src = base64;
            img.onerror = () => {
              console.error("Failed to load image, possibly unsupported format (e.g., WMF/EMF)");
              setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
              toast.error(`无法加载图片: ${file.name}，可能是不受支持的格式。`);
            };
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
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
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
              const newAttachment: Attachment = {
                name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                type: 'image/jpeg',
                data: compressedBase64.split(',')[1],
                url: compressedBase64
              };
              setAttachments(prev => [...prev, newAttachment]);
              setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
            };
          };
          reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + "\n";
            setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: Math.round((i / pdf.numPages) * 100) } : f));
          }
          const newAttachment: Attachment = {
            name: file.name,
            type: 'text/plain',
            data: btoa(unescape(encodeURIComponent(fullText))),
            url: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(fullText)))}`,
            extractedText: fullText
          };
          setAttachments(prev => [...prev, newAttachment]);
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        } else if (file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value;
          const newAttachment: Attachment = {
            name: file.name,
            type: 'text/plain',
            data: btoa(unescape(encodeURIComponent(text))),
            url: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(text)))}`,
            extractedText: text
          };
          setAttachments(prev => [...prev, newAttachment]);
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          const text = await file.text();
          const newAttachment: Attachment = {
            name: file.name,
            type: 'text/plain',
            data: btoa(unescape(encodeURIComponent(text))),
            url: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(text)))}`,
            extractedText: text
          };
          setAttachments(prev => [...prev, newAttachment]);
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        } else {
          toast.error(`不支持的文件类型: ${file.type || file.name.split('.').pop()}`);
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        }
      } catch (err: any) {
        console.error("File processing error:", err);
        toast.error(`文件处理失败: ${file.name}`);
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      }
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
    if (isLoading) {
      toast.warning("AI 正在思考中，请稍候...");
      return;
    }
    if (!input.trim() && attachments.length === 0) {
      toast.warning("请输入内容或上传附件");
      return;
    }
    
    console.log("ChatApp: sendMessage triggered");
    toast.info("正在发送消息...");

    const currentInput = input;
    const currentAttachments = [...attachments];
    const currentSessionIdLocal = currentSessionId;
    
    let sessionId = currentSessionIdLocal;
    
    // Calculate history BEFORE updating state with the new message
    const currentSession = sessions.find(s => s.id === sessionId);
    const history = currentSession ? currentSession.messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    })) : [];

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: Date.now(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined
    };

    // 1. Update sessions and currentSessionId in one go if needed
    if (!sessionId) {
      const newSessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: newSessionId,
        title: currentInput.slice(0, 30) || '新对话',
        messages: [userMessage],
        updatedAt: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSessionId);
      sessionId = newSessionId;
    } else {
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { 
              ...s, 
              messages: [...s.messages, userMessage], 
              updatedAt: Date.now(),
              title: s.messages.length === 0 ? currentInput.slice(0, 30) || '新对话' : s.title 
            }
          : s
      ));
    }

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setAttachments([]);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Prepare messages for OpenAI format
      const systemMessage = { role: 'system', content: "你是一个极其专业的助手。请详尽、有逻辑地回答问题，不要偷懒。" };
      
      const promptWithSuffix = currentInput + " (请详细回复，字数多一点)";
      let finalContent: any = promptWithSuffix;
      
      // Extract text from non-image attachments
      const textAttachments = currentAttachments.filter(a => a.extractedText);
      if (textAttachments.length > 0) {
        const extraText = textAttachments.map(a => `\n\n--- 文件: ${a.name} ---\n${a.extractedText}`).join('');
        finalContent = promptWithSuffix + extraText;
      }

      const imageAttachments = currentAttachments.filter(a => a.type.startsWith('image/'));
      if (imageAttachments.length > 0) {
        finalContent = [
          { type: "text", text: typeof finalContent === 'string' ? finalContent : promptWithSuffix },
          ...imageAttachments.map(att => ({
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
          if (response.status === 504) {
            throw new Error("请求超时 (504)：模型思考时间过长，超过了 Vercel 免费版的限制。建议切换到非 Max 版本的模型（如 Gemini 3 Flash）以获得更快的响应。");
          }
          if (text.includes("<!doctype html>") || text.includes("<html>")) {
            throw new Error(`服务器返回了 HTML 页面而非 JSON (状态码: ${response.status})。这通常意味着 API 路由未正确匹配或服务器正在重启。`);
          }
          throw new Error(`服务器返回了非 JSON 响应 (状态码: ${response.status})。内容: ${text.slice(0, 100)}...`);
        }
        throw new Error(errorData.error || `服务器错误: ${response.status}`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";
      
      const aiMessageId = (Date.now() + 2).toString();
      const initialAiMessage: Message = {
        id: aiMessageId,
        role: 'model',
        content: "",
        timestamp: Date.now()
      };

      // Add empty message
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, messages: [...s.messages, initialAiMessage], updatedAt: Date.now() }
          : s
      ));

      if (reader) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || "";
            
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
              
              const dataStr = trimmedLine.slice(6).trim();
              if (dataStr === '[DONE]') break;
              
              try {
                const data = JSON.parse(dataStr);
                const content = data.choices?.[0]?.delta?.content || "";
                if (content) {
                  aiContent += content;
                  setSessions(prev => prev.map(s => 
                    s.id === sessionId 
                      ? { 
                          ...s, 
                          messages: s.messages.map(m => 
                            m.id === aiMessageId ? { ...m, content: aiContent } : m
                          ) 
                        }
                      : s
                  ));
                }
              } catch (e) {}
            }
          }
        } catch (error: any) {
          if (error.name === 'AbortError') throw error;
          aiContent += "\n\n[连接中断，请重试]";
          setSessions(prev => prev.map(s => 
            s.id === sessionId 
              ? { 
                  ...s, 
                  messages: s.messages.map(m => 
                    m.id === aiMessageId ? { ...m, content: aiContent } : m
                  ) 
                }
              : s
          ));
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      console.error("Gemini API Error:", error);
      const errorMsg = error.message.includes('internal error')
        ? '网络连接失败 (Internal Error)。这通常是由于 API 地址错误或服务器无法访问导致的。请检查您的接口地址 (Base URL) 是否正确，并尝试点击“恢复默认设置”。'
        : (error.message === 'Failed to fetch' 
          ? '网络连接失败 (Failed to fetch)。请检查您的网络连接，或确保 API 地址 (Base URL) 正确且可访问。' 
          : error.message);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `发生错误: ${errorMsg}`,
        timestamp: Date.now()
      };
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, messages: [...s.messages, errorMessage], updatedAt: Date.now() }
          : s
      ));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
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
            <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
              {allModels.map(m => (
                <div key={m.id} className="relative group/model">
                  <button
                    onClick={() => setSelectedModel(m.id)}
                    className={cn(
                      "w-full text-left p-2 rounded-lg text-xs transition-all border pr-8",
                      selectedModel === m.id 
                        ? "bg-blue-600/10 border-blue-500/50 text-blue-400" 
                        : "bg-[var(--bg-hover)] border-transparent text-[var(--text-main)] hover:bg-[var(--border-color)]"
                    )}
                  >
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-[9px] opacity-60 truncate">{m.desc}</div>
                  </button>
                  {customModels.some(cm => cm.id === m.id) && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomModels(prev => prev.filter(cm => cm.id !== m.id));
                        if (selectedModel === m.id) setSelectedModel(MODELS[0].id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-red-400 opacity-0 group-hover/model:opacity-100 hover:bg-red-500/10 rounded transition-all"
                      title="删除自定义模型"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="px-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">添加自定义模型</div>
            <div className="flex gap-2">
              <input 
                type="text"
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value)}
                placeholder="输入模型 ID (如: [A渠道]...)"
                className="flex-1 bg-[var(--bg-hover)] border border-transparent focus:border-blue-500/50 rounded-lg p-2 text-[10px] text-[var(--text-main)] outline-none"
              />
              <button 
                onClick={() => {
                  if (!newModelId.trim()) return;
                  if (allModels.some(m => m.id === newModelId.trim())) {
                    toast.error("该模型已存在");
                    return;
                  }
                  const nameMatch = newModelId.match(/\]([^\]]+)$/);
                  const name = nameMatch ? nameMatch[1] : newModelId.slice(-15);
                  setCustomModels(prev => [...prev, { 
                    id: newModelId.trim(), 
                    name: name, 
                    desc: "自定义模型" 
                  }]);
                  setNewModelId('');
                  toast.success("模型添加成功");
                }}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                title="添加"
              >
                <Plus size={14} />
              </button>
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
          <div 
            onClick={toggleTheme}
            className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-[var(--bg-hover)] text-sm text-[var(--text-main)] cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "relative w-9 h-5 rounded-full transition-colors duration-200 flex items-center px-1",
                theme === 'dark' ? "bg-blue-600" : "bg-gray-400"
              )}>
                <motion.div 
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={cn(
                    "w-3.5 h-3.5 bg-white rounded-full shadow-sm",
                    theme === 'dark' ? "ml-auto" : "mr-auto"
                  )} 
                />
              </div>
              <span>{theme === 'dark' ? '白天模式' : '夜间模式'}</span>
            </div>
            {theme === 'dark' ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-blue-400" />}
          </div>
          <div className="space-y-2 mt-4 px-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">字体大小</span>
              <span className="text-[10px] font-mono">{fontSize}px</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFontSize(Math.max(12, fontSize - 1))} className="p-1 hover:bg-[var(--bg-hover)] rounded"><Type size={14} className="scale-75" /></button>
              <input type="range" min="12" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="flex-1 h-1 bg-[var(--bg-hover)] rounded-full appearance-none cursor-pointer accent-blue-500" />
              <button onClick={() => setFontSize(Math.min(24, fontSize + 1))} className="p-1 hover:bg-[var(--bg-hover)] rounded"><Type size={18} className="scale-75" /></button>
            </div>
          </div>

          <button 
            onClick={() => {
              toast.info("帮助信息", {
                description: (
                  <div className="space-y-2 text-xs">
                    <p>1. <strong>API 密钥</strong>: 在侧边栏输入您的 Gemini API Key。您可以从 Google AI Studio 获取。</p>
                    <p>2. <strong>接口地址</strong>: 默认使用内置代理。如果您有自己的中转地址，请在此修改。</p>
                    <p>3. <strong>文件上传</strong>: 支持图片、PDF、TXT、DOCX。非图片文件将自动提取文本内容。</p>
                    <p>4. <strong>免费限制</strong>: 免费版 Gemini API 通常有每分钟 15 次请求和每天 1500 次请求的限制。</p>
                  </div>
                ),
                duration: 10000
              });
            }}
            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[var(--bg-hover)] text-sm text-[var(--text-main)]"
          >
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
              onClick={onBack}
              className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors text-blue-500"
              title="返回功能选择"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="w-px h-6 bg-[var(--border-color)] mx-1" />
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
                              <div className="p-3 bg-[var(--bg-sidebar)] flex items-center gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <Paperclip size={14} />
                                  <span>{att.name}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={cn(
                      "rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
                      msg.role === 'user' ? "bg-[var(--message-user)] text-[var(--text-main)]" : "bg-transparent text-[var(--text-main)]"
                    )} style={{ fontSize: `${fontSize}px` }}>
                      <div className={cn(
                        "prose max-w-none prose-p:leading-relaxed prose-pre:bg-[var(--bg-main)] prose-pre:border prose-pre:border-[var(--border-color)]",
                        theme === 'dark' ? "prose-invert" : "prose-slate"
                      )}>
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] opacity-60 mt-1">
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
                ref={textareaRef}
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



