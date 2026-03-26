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
  LayoutGrid,
  Video,
  Wrench,
  ArrowLeft,
  Search,
  Calculator,
  BookOpen,
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
  ShieldCheck
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { ChatSession, Message, Attachment } from './types';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
  const [view, setView] = useState<'hub' | 'chat' | 'tools_hub' | 'hardware_manual' | 'converter_hub' | 'file_converter' | 'cost_engineer_ai'>('hub');
  const [converterType, setConverterType] = useState<'word_to_pdf' | 'excel_to_pdf' | 'pdf_to_word'>('word_to_pdf');
  const [theme, setTheme] = useState<'dark' | 'light'>(localStorage.getItem('theme') as 'dark' | 'light' || 'dark');
  const [fontSize, setFontSize] = useState<number>(Number(localStorage.getItem('font_size')) || 16);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('gemini_selected_model') || MODELS[0].id);
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('gemini_base_url') || DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY);

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
              onSelectTools={() => setView('tools_hub')}
              onSelectConverter={() => setView('converter_hub')}
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
            />
          </motion.div>
        ) : view === 'tools_hub' ? (
          <motion.div
            key="tools_hub"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ToolsHub 
              onBack={() => setView('hub')} 
              onSelectHardware={() => setView('hardware_manual')}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          </motion.div>
        ) : view === 'hardware_manual' ? (
          <motion.div
            key="hardware_manual"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-screen"
          >
            <HardwareManual onBack={() => setView('tools_hub')} theme={theme} toggleTheme={toggleTheme} />
          </motion.div>
        ) : view === 'converter_hub' ? (
          <motion.div
            key="converter_hub"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ConverterHub 
              onBack={() => setView('hub')} 
              onSelectConverter={(type) => {
                setConverterType(type);
                setView('file_converter');
              }}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          </motion.div>
        ) : view === 'file_converter' ? (
          <motion.div
            key="file_converter"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-screen"
          >
            <FileConverter 
              type={converterType} 
              onBack={() => setView('converter_hub')} 
              theme={theme} 
              toggleTheme={toggleTheme} 
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

function Hub({ onSelectChat, onSelectTools, onSelectConverter, onSelectCostAI, theme, toggleTheme }: { onSelectChat: () => void; onSelectTools: () => void; onSelectConverter: () => void; onSelectCostAI: () => void; theme: 'dark' | 'light'; toggleTheme: () => void }) {
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
    },
    {
      id: 'converter',
      title: '文件转换',
      description: 'Word 转 PDF、表格转 PDF，快速高效的文件格式转换工具。',
      icon: <FileText className="w-8 h-8 text-orange-500" />,
      active: true,
      onClick: onSelectConverter
    },
    {
      id: 'draw',
      title: 'AI 画图',
      description: '通过文字描述生成精美图片。',
      icon: <ImageIcon className="w-8 h-8 text-purple-500" />,
      active: false
    },
    {
      id: 'tools',
      title: '工程小工具',
      description: '五金手册、钢材计算器，各种实用的工程计算工具。',
      icon: <Wrench className="w-8 h-8 text-green-500" />,
      active: true,
      onClick: onSelectTools
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

function ConverterHub({ onBack, onSelectConverter, theme, toggleTheme }: { onBack: () => void; onSelectConverter: (type: 'word_to_pdf' | 'excel_to_pdf' | 'pdf_to_word') => void; theme: 'dark' | 'light'; toggleTheme: () => void }) {
  const tools = [
    {
      id: 'word_to_pdf',
      title: 'Word 转 PDF',
      description: '支持 .docx 格式，保持原有排版，一键生成 PDF 文档。',
      icon: <FileText className="w-8 h-8 text-blue-500" />,
      active: true,
      onClick: () => onSelectConverter('word_to_pdf')
    },
    {
      id: 'excel_to_pdf',
      title: '表格转 PDF',
      description: '支持 .xlsx, .xls 格式，自动调整表格宽度，完美转换。',
      icon: <LayoutGrid className="w-8 h-8 text-green-500" />,
      active: true,
      onClick: () => onSelectConverter('excel_to_pdf')
    },
    {
      id: 'pdf_to_word',
      title: 'PDF 转 Word',
      description: '高精度识别文字与布局，轻松编辑 PDF 内容。',
      icon: <FileUp className="w-8 h-8 text-purple-500" />,
      active: false
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] p-8 flex flex-col items-center overflow-y-auto relative">
      <div className="absolute top-0 left-0 p-6">
        <button 
          onClick={onBack}
          className="p-3 hover:bg-[var(--bg-secondary)] rounded-full transition-colors text-[var(--text-muted)] hover:text-blue-500 flex items-center gap-2"
        >
          <ArrowLeft size={24} />
          <span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

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
          className="inline-block p-5 rounded-[2.5rem] bg-gradient-to-br from-orange-500/20 to-red-500/20 mb-8 shadow-xl shadow-orange-500/5"
        >
          <FileText className="w-16 h-16 text-orange-500" />
        </motion.div>
        <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent tracking-tight">
          文件转换中心
        </h1>
        <p className="text-[var(--text-muted)] text-xl font-light tracking-wide">简单、快速、安全的文件格式转换</p>
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
              tool.active ? "cursor-pointer hover:shadow-2xl hover:border-orange-500/40 hover:bg-[var(--bg-secondary)]" : "opacity-60 grayscale cursor-not-allowed"
            )}
          >
            {tool.active && (
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <ChevronRight className="w-8 h-8 text-orange-500" />
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
          </motion.div>
        ))}
      </div>
      
      <footer className="mt-auto pt-24 pb-12 text-[var(--text-muted)] text-sm flex flex-col items-center gap-4">
        <div className="flex gap-8 mb-2 font-medium">
          <span className="hover:text-orange-500 transition-colors cursor-pointer">关于我们</span>
          <span className="hover:text-orange-500 transition-colors cursor-pointer">服务条款</span>
          <span className="hover:text-orange-500 transition-colors cursor-pointer">隐私政策</span>
        </div>
        <div className="h-px w-12 bg-[var(--border-main)]" />
        <p className="tracking-widest uppercase text-[10px] font-bold">© 2026 AI 智能工作台 | 探索 AI 的无限可能</p>
      </footer>
    </div>
  );
}

function FileConverter({ type, onBack, theme, toggleTheme }: { type: 'word_to_pdf' | 'excel_to_pdf' | 'pdf_to_word'; onBack: () => void; theme: 'dark' | 'light'; toggleTheme: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const titles = {
    word_to_pdf: 'Word 转 PDF',
    excel_to_pdf: '表格转 PDF',
    pdf_to_word: 'PDF 转 Word'
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResultUrl(null);
      setProgress(0);
    }
  };

  const convertWordToPdf = async (file: File) => {
    try {
      setIsConverting(true);
      setProgress(20);
      
      const arrayBuffer = await file.arrayBuffer();
      setProgress(40);
      
      const result = await mammoth.convertToHtml({ arrayBuffer }, {
        convertImage: mammoth.images.imgElement((image) => {
          // Broaden check for WMF/EMF images as they cause atob errors in many libraries
          const contentType = (image.contentType || '').toLowerCase();
          if (
            contentType.includes('wmf') || 
            contentType.includes('emf') ||
            contentType.includes('x-wmf') ||
            contentType.includes('x-emf') ||
            contentType.includes('vnd.ms-wmf') ||
            contentType.includes('vnd.ms-emf') ||
            contentType.includes('ms-wmf') ||
            contentType.includes('ms-emf')
          ) {
            console.warn(`Skipping unsupported image format: ${contentType}`);
            return Promise.resolve({ src: "" });
          }

          return image.read("base64").then((imageBuffer) => {
            // Sanitize base64: remove any characters that are not valid base64
            // This ensures atob() won't fail on whitespace or malformed data
            const sanitizedBuffer = imageBuffer.replace(/[^A-Za-z0-9+/=]/g, '');
            
            // Basic validation: if it's too short, it's likely malformed
            if (sanitizedBuffer.length < 10) {
              return { src: "" };
            }

            return {
              src: `data:${image.contentType};base64,${sanitizedBuffer}`
            };
          }).catch(err => {
            console.error("Error reading image as base64:", err);
            return { src: "" };
          });
        })
      });
      let html = result.value;
      
      // More aggressive regex to strip any remaining WMF/EMF images or broken data URLs
      // Using a more robust regex that handles attributes in any order and both quote types
      html = html.replace(/<img[^>]+src=["']data:image\/[^;]+[we]mf[^"']+["'][^>]*>/gi, '<!-- Unsupported Image Removed -->');
      html = html.replace(/<img[^>]+src=["']["'][^>]*>/gi, ''); // Remove empty images
      html = html.replace(/<img[^>]+src=["']data:[^"']*;base64,\s*["'][^>]*>/gi, ''); // Remove empty base64
      
      // Global sanitizer for all remaining base64 images to fix any atob issues
      html = html.replace(/(src=["']data:[^;]+;base64,)([^"']+)/gi, (match, prefix, base64) => {
        const sanitized = base64.replace(/[^A-Za-z0-9+/=]/g, '');
        // Ensure correct padding for atob
        const remainder = sanitized.length % 4;
        const padded = remainder === 0 ? sanitized : sanitized.padEnd(sanitized.length + (4 - remainder), '=');
        return prefix + padded;
      });
      
      setProgress(60);

      // Create a hidden container for rendering
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.padding = '40px';
      container.style.width = '800px';
      container.style.background = 'white';
      container.style.color = 'black';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 2 // Improve quality
      });
      document.body.removeChild(container);
      setProgress(80);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Use canvas directly to avoid UNKNOWN type errors with data URLs
      pdf.addImage(canvas, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      setResultUrl(url);
      setProgress(100);
      toast.success('转换成功！');
    } catch (error) {
      console.error(error);
      toast.error('转换失败，请重试');
    } finally {
      setIsConverting(false);
    }
  };

  const convertExcelToPdf = async (file: File) => {
    try {
      setIsConverting(true);
      setProgress(20);
      
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      setProgress(40);
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      let html = XLSX.utils.sheet_to_html(worksheet);
      
      // Aggressive strip for WMF/EMF images in Excel HTML
      html = html.replace(/<img[^>]+src=["']data:image\/[^;]+[we]mf[^"']+["'][^>]*>/gi, '<!-- Unsupported Image Removed -->');
      html = html.replace(/<img[^>]+src=["']["'][^>]*>/gi, '');
      html = html.replace(/<img[^>]+src=["']data:[^"']*;base64,\s*["'][^>]*>/gi, '');
      
      // Global sanitizer for all remaining base64 images to fix any atob issues
      html = html.replace(/(src=["']data:[^;]+;base64,)([^"']+)/gi, (match, prefix, base64) => {
        const sanitized = base64.replace(/[^A-Za-z0-9+/=]/g, '');
        const remainder = sanitized.length % 4;
        const padded = remainder === 0 ? sanitized : sanitized.padEnd(sanitized.length + (4 - remainder), '=');
        return prefix + padded;
      });
      
      setProgress(60);

      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.padding = '20px';
      container.style.background = 'white';
      container.style.color = 'black';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      
      // Basic table styling
      const style = document.createElement('style');
      style.innerHTML = `
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #ccc; padding: 8px; text-align: left; }
      `;
      container.appendChild(style);
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 2
      });
      document.body.removeChild(container);
      setProgress(80);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Use canvas directly to avoid UNKNOWN type errors with data URLs
      pdf.addImage(canvas, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      setResultUrl(url);
      setProgress(100);
      toast.success('转换成功！');
    } catch (error) {
      console.error(error);
      toast.error('转换失败，请重试');
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvert = () => {
    if (!file) return;
    if (type === 'word_to_pdf') convertWordToPdf(file);
    else if (type === 'excel_to_pdf') convertExcelToPdf(file);
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden">
      <header className="h-16 border-b border-[var(--border-color)] flex items-center px-6 justify-between bg-[var(--bg-secondary)]/30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors text-orange-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="text-orange-500" size={24} />
            <h1 className="text-xl font-bold">{titles[type]}</h1>
          </div>
        </div>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-blue-400" />}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
        <div className="max-w-2xl w-full space-y-8">
          <div 
            className={cn(
              "border-2 border-dashed rounded-[2.5rem] p-12 flex flex-col items-center justify-center transition-all cursor-pointer",
              file ? "border-orange-500/50 bg-orange-500/5" : "border-[var(--border-color)] hover:border-orange-500/30 bg-[var(--bg-secondary)]/30"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              accept={type === 'word_to_pdf' ? '.docx' : '.xlsx,.xls'}
            />
            
            {file ? (
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-2xl bg-orange-500/10 mb-4">
                  <FileCheck className="w-12 h-12 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">{file.name}</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button 
                  className="mt-4 text-xs text-red-500 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setResultUrl(null);
                  }}
                >
                  移除文件
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-2xl bg-[var(--bg-main)] mb-4 shadow-inner">
                  <FileUp className="w-12 h-12 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-xl font-bold mb-2">点击或拖拽上传文件</h3>
                <p className="text-sm text-[var(--text-muted)] max-w-xs">
                  {type === 'word_to_pdf' ? '支持 .docx 格式' : '支持 .xlsx, .xls 格式'}
                </p>
              </div>
            )}
          </div>

          {file && !resultUrl && (
            <button
              disabled={isConverting}
              onClick={handleConvert}
              className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-lg hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isConverting ? (
                <>
                  <Loader2 className="animate-spin" />
                  正在转换 ({progress}%)
                </>
              ) : (
                <>
                  <FileDown />
                  开始转换
                </>
              )}
            </button>
          )}

          {resultUrl && (
            <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-green-500/20">
                <FileCheck className="w-12 h-12 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-500">转换完成！</h3>
                <p className="text-sm text-[var(--text-muted)]">您的文件已准备就绪</p>
              </div>
              <div className="flex gap-4 w-full">
                <a 
                  href={resultUrl} 
                  download={`${file?.name.split('.')[0]}.pdf`}
                  className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  下载 PDF
                </a>
                <button 
                  onClick={() => {
                    setFile(null);
                    setResultUrl(null);
                  }}
                  className="px-6 py-3 rounded-xl border border-green-500/30 text-green-500 font-bold hover:bg-green-500/5 transition-all"
                >
                  再次转换
                </button>
              </div>
            </div>
          )}

          <div className="bg-[var(--bg-secondary)] p-6 rounded-3xl border border-[var(--border-color)]">
            <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Info size={16} className="text-orange-500" />
              使用说明
            </h4>
            <ul className="text-xs text-[var(--text-muted)] space-y-2 list-disc list-inside">
              <li>文件大小限制在 10MB 以内。</li>
              <li>转换过程在浏览器本地完成，保护您的隐私安全。</li>
              <li>如果排版较为复杂，转换结果可能存在细微差异。</li>
              <li>转换完成后请及时下载，刷新页面后文件将消失。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolsHub({ onBack, onSelectHardware, theme, toggleTheme }: { onBack: () => void; onSelectHardware: () => void; theme: 'dark' | 'light'; toggleTheme: () => void }) {
  const tools = [
    {
      id: 'hardware',
      title: '五金手册',
      description: '钢材参数查询与自动计算，支持圆钢、方钢、圆管等多种规格。',
      icon: <BookOpen className="w-8 h-8 text-green-500" />,
      active: true,
      onClick: onSelectHardware
    },
    {
      id: 'unit_conv',
      title: '单位换算',
      description: '长度、面积、体积、重量等工程常用单位快速换算。',
      icon: <Calculator className="w-8 h-8 text-blue-500" />,
      active: false
    },
    {
      id: 'material',
      title: '材料密度表',
      description: '常用金属、非金属材料密度查询。',
      icon: <LayoutGrid className="w-8 h-8 text-orange-500" />,
      active: false
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] p-8 flex flex-col items-center overflow-y-auto relative">
      <div className="absolute top-0 left-0 p-6">
        <button 
          onClick={onBack}
          className="p-3 hover:bg-[var(--bg-secondary)] rounded-full transition-colors text-[var(--text-muted)] hover:text-blue-500 flex items-center gap-2"
        >
          <ArrowLeft size={24} />
          <span className="text-sm font-medium">返回主页</span>
        </button>
      </div>

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
          className="inline-block p-5 rounded-[2.5rem] bg-gradient-to-br from-green-500/20 to-blue-500/20 mb-8 shadow-xl shadow-green-500/5"
        >
          <Wrench className="w-16 h-16 text-green-500" />
        </motion.div>
        <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent tracking-tight">
          工程小工具
        </h1>
        <p className="text-[var(--text-muted)] text-xl font-light tracking-wide">专业、精准、高效的工程辅助工具集</p>
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
              tool.active ? "cursor-pointer hover:shadow-2xl hover:border-green-500/40 hover:bg-[var(--bg-secondary)]" : "opacity-60 grayscale cursor-not-allowed"
            )}
          >
            {tool.active && (
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <ChevronRight className="w-8 h-8 text-green-500" />
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

function HardwareManual({ onBack, theme, toggleTheme }: { onBack: () => void; theme: 'dark' | 'light'; toggleTheme: () => void }) {
  const [selectedType, setSelectedType] = useState('round_bar');
  const [dimensions, setDimensions] = useState<Record<string, string>>({
    d: '', // diameter
    L: '1', // length
    a: '', // side
    t: '', // thickness
    b: '', // width
    W: '', // width
    D: '', // outer diameter
    h: '', // height
  });

  const steelTypes = [
    { 
      id: 'round_bar', 
      name: '圆钢', 
      icon: '⚪', 
      formula: '0.00617 × d² × L',
      specs: [
        { label: '6mm', values: { d: '6' }, weight: '0.222' },
        { label: '8mm', values: { d: '8' }, weight: '0.395' },
        { label: '10mm', values: { d: '10' }, weight: '0.617' },
        { label: '12mm', values: { d: '12' }, weight: '0.888' },
        { label: '14mm', values: { d: '14' }, weight: '1.21' },
        { label: '16mm', values: { d: '16' }, weight: '1.58' },
        { label: '18mm', values: { d: '18' }, weight: '2.00' },
        { label: '20mm', values: { d: '20' }, weight: '2.47' },
        { label: '22mm', values: { d: '22' }, weight: '2.98' },
        { label: '25mm', values: { d: '25' }, weight: '3.85' },
      ]
    },
    { 
      id: 'square_bar', 
      name: '方钢', 
      icon: '⬜', 
      formula: '0.00785 × a² × L',
      specs: [
        { label: '10x10', values: { a: '10' }, weight: '0.785' },
        { label: '12x12', values: { a: '12' }, weight: '1.13' },
        { label: '14x14', values: { a: '14' }, weight: '1.54' },
        { label: '16x16', values: { a: '16' }, weight: '2.01' },
        { label: '18x18', values: { a: '18' }, weight: '2.54' },
        { label: '20x20', values: { a: '20' }, weight: '3.14' },
        { label: '25x25', values: { a: '25' }, weight: '4.91' },
      ]
    },
    { 
      id: 'flat_bar', 
      name: '扁钢', 
      icon: '➖', 
      formula: '0.00785 × b × t × L',
      specs: [
        { label: '20x3', values: { b: '20', t: '3' }, weight: '0.471' },
        { label: '25x3', values: { b: '25', t: '3' }, weight: '0.589' },
        { label: '30x3', values: { b: '30', t: '3' }, weight: '0.707' },
        { label: '40x4', values: { b: '40', t: '4' }, weight: '1.26' },
        { label: '50x5', values: { b: '50', t: '5' }, weight: '1.96' },
        { label: '60x6', values: { b: '60', t: '6' }, weight: '2.83' },
      ]
    },
    { 
      id: 'round_tube', 
      name: '圆管', 
      icon: '⭕', 
      formula: '0.02466 × (D - t) × t × L',
      specs: [
        { label: '20x2', values: { D: '20', t: '2' }, weight: '0.888' },
        { label: '25x2', values: { D: '25', t: '2' }, weight: '1.13' },
        { label: '32x3', values: { D: '32', t: '3' }, weight: '2.15' },
        { label: '40x3', values: { D: '40', t: '3' }, weight: '2.74' },
        { label: '50x3', values: { D: '50', t: '3' }, weight: '3.48' },
        { label: '60x4', values: { D: '60', t: '4' }, weight: '5.52' },
      ]
    },
    { 
      id: 'square_tube', 
      name: '方管', 
      icon: '🔲', 
      formula: '0.0157 × t × (a + b - 2.8584 × t) × L',
      specs: [
        { label: '20x20x2', values: { a: '20', b: '20', t: '2' }, weight: '1.15' },
        { label: '25x25x2', values: { a: '25', b: '25', t: '2' }, weight: '1.46' },
        { label: '30x30x3', values: { a: '30', b: '30', t: '3' }, weight: '2.54' },
        { label: '40x40x3', values: { a: '40', b: '40', t: '3' }, weight: '3.48' },
        { label: '50x50x4', values: { a: '50', b: '50', t: '4' }, weight: '5.74' },
      ]
    },
    { 
      id: 'steel_plate', 
      name: '钢板', 
      icon: '📄', 
      formula: '7.85 × L(m) × W(m) × t(mm)',
      specs: [
        { label: '1mm', values: { t: '1' }, weight: '7.85' },
        { label: '2mm', values: { t: '2' }, weight: '15.7' },
        { label: '3mm', values: { t: '3' }, weight: '23.55' },
        { label: '4mm', values: { t: '4' }, weight: '31.4' },
        { label: '5mm', values: { t: '5' }, weight: '39.25' },
        { label: '6mm', values: { t: '6' }, weight: '47.1' },
        { label: '8mm', values: { t: '8' }, weight: '62.8' },
        { label: '10mm', values: { t: '10' }, weight: '78.5' },
      ]
    },
    { 
      id: 'angle_steel', 
      name: '等边角钢', 
      icon: '📐', 
      formula: '0.00785 × [d × (2b - d) + 0.215 × (r² - 2r1²)]',
      specs: [
        { label: '20x3', values: { b: '20', d: '3' }, weight: '0.889' },
        { label: '25x3', values: { b: '25', d: '3' }, weight: '1.12' },
        { label: '30x3', values: { b: '30', d: '3' }, weight: '1.37' },
        { label: '40x4', values: { b: '40', d: '4' }, weight: '2.42' },
        { label: '50x5', values: { b: '50', d: '5' }, weight: '3.77' },
      ]
    },
  ];

  const calculate = () => {
    const d = parseFloat(dimensions.d || '0');
    const L = parseFloat(dimensions.L || '0');
    const a = parseFloat(dimensions.a || '0');
    const t = parseFloat(dimensions.t || '0');
    const b = parseFloat(dimensions.b || '0');
    const W = parseFloat(dimensions.W || '0');
    const D = parseFloat(dimensions.D || '0');

    let weight = 0;
    let area = 0;
    let perimeter = 0;

    switch (selectedType) {
      case 'round_bar':
        weight = 0.00617 * d * d * L;
        area = Math.PI * Math.pow(d / 2, 2);
        perimeter = Math.PI * d;
        break;
      case 'square_bar':
        weight = 0.00785 * a * a * L;
        area = a * a;
        perimeter = 4 * a;
        break;
      case 'flat_bar':
        weight = 0.00785 * b * t * L;
        area = b * t;
        perimeter = 2 * (b + t);
        break;
      case 'round_tube':
        weight = 0.02466 * (D - t) * t * L;
        area = Math.PI * (Math.pow(D / 2, 2) - Math.pow((D - 2 * t) / 2, 2));
        perimeter = Math.PI * D;
        break;
      case 'square_tube':
        // a is side1, b is side2 (if rectangular)
        const sideA = a || b;
        const sideB = b || a;
        weight = 0.0157 * t * (sideA + sideB - 2.8584 * t) * L;
        area = (sideA * sideB) - ((sideA - 2 * t) * (sideB - 2 * t));
        perimeter = 2 * (sideA + sideB);
        break;
      case 'steel_plate':
        // L and W are in meters, t in mm
        weight = 7.85 * L * W * t;
        area = L * W;
        perimeter = 2 * (L + W);
        break;
      default:
        break;
    }

    return {
      weight: weight.toFixed(3),
      area: area.toFixed(2),
      perimeter: perimeter.toFixed(2),
      volume: (area * (selectedType === 'steel_plate' ? t / 1000 : L / 1000)).toFixed(4)
    };
  };

  const results = calculate();

  const handleInputChange = (key: string, value: string) => {
    setDimensions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-[var(--border-color)] flex items-center px-6 justify-between bg-[var(--bg-secondary)]/30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors text-green-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="text-green-500" size={24} />
            <h1 className="text-xl font-bold">五金手册 & 钢材计算器</h1>
          </div>
        </div>
        <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-3 py-1 rounded-full border border-[var(--border-color)]">
          密度: 7.85g/cm³ (碳钢)
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-8">
        {/* Left: Selection & Inputs */}
        <div className="flex-1 space-y-8">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
              <LayoutGrid size={16} /> 选择钢材类型
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {steelTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center",
                    selectedType === type.id 
                      ? "bg-green-500/10 border-green-500/50 text-green-500 shadow-lg shadow-green-500/5" 
                      : "bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-green-500/30"
                  )}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className="text-sm font-medium">{type.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Common Specs */}
          <section className="bg-[var(--bg-secondary)]/30 p-6 rounded-[2rem] border border-[var(--border-color)]">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
              <LayoutGrid size={16} /> 常用规格 (点击自动填入)
            </h2>
            <div className="flex flex-wrap gap-2">
              {steelTypes.find(t => t.id === selectedType)?.specs?.map((spec) => (
                <button
                  key={spec.label}
                  onClick={() => {
                    setDimensions(prev => ({ ...prev, ...spec.values }));
                    toast.success(`已选择规格: ${spec.label}`);
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] hover:border-green-500/50 hover:bg-green-500/5 transition-all text-xs font-medium group"
                >
                  <div className="flex flex-col items-center">
                    <span>{spec.label}</span>
                    <span className="text-[10px] text-[var(--text-muted)] group-hover:text-green-500/70">
                      {spec.weight}kg/m
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-[var(--bg-secondary)]/50 p-6 rounded-[2rem] border border-[var(--border-color)]">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] mb-6 flex items-center gap-2">
              <Calculator size={16} /> 输入参数
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {selectedType === 'round_bar' && (
                <DimensionInput label="直径 d (mm)" value={dimensions.d} onChange={v => handleInputChange('d', v)} />
              )}
              {selectedType === 'square_bar' && (
                <DimensionInput label="边宽 a (mm)" value={dimensions.a} onChange={v => handleInputChange('a', v)} />
              )}
              {selectedType === 'flat_bar' && (
                <>
                  <DimensionInput label="宽度 b (mm)" value={dimensions.b} onChange={v => handleInputChange('b', v)} />
                  <DimensionInput label="厚度 t (mm)" value={dimensions.t} onChange={v => handleInputChange('t', v)} />
                </>
              )}
              {selectedType === 'round_tube' && (
                <>
                  <DimensionInput label="外径 D (mm)" value={dimensions.D} onChange={v => handleInputChange('D', v)} />
                  <DimensionInput label="壁厚 t (mm)" value={dimensions.t} onChange={v => handleInputChange('t', v)} />
                </>
              )}
              {selectedType === 'square_tube' && (
                <>
                  <DimensionInput label="边宽 a (mm)" value={dimensions.a} onChange={v => handleInputChange('a', v)} />
                  <DimensionInput label="边宽 b (mm) (可选)" value={dimensions.b} onChange={v => handleInputChange('b', v)} />
                  <DimensionInput label="壁厚 t (mm)" value={dimensions.t} onChange={v => handleInputChange('t', v)} />
                </>
              )}
              {selectedType === 'steel_plate' && (
                <>
                  <DimensionInput label="长度 L (m)" value={dimensions.L} onChange={v => handleInputChange('L', v)} />
                  <DimensionInput label="宽度 W (m)" value={dimensions.W} onChange={v => handleInputChange('W', v)} />
                  <DimensionInput label="厚度 t (mm)" value={dimensions.t} onChange={v => handleInputChange('t', v)} />
                </>
              )}
              {selectedType !== 'steel_plate' && (
                <DimensionInput label="长度 L (m)" value={dimensions.L} onChange={v => handleInputChange('L', v)} />
              )}
            </div>
            
            <div className="mt-8 p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-start gap-3">
              <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-[var(--text-muted)] leading-relaxed">
                理论重量计算公式: <code className="text-blue-400">{steelTypes.find(t => t.id === selectedType)?.formula}</code>
                <br />
                注：计算结果仅供参考，实际重量以过磅为准。
              </div>
            </div>
          </section>
        </div>

        {/* Right: Results Display */}
        <div className="w-full lg:w-80 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
            <Search size={16} /> 计算结果
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            <ResultCard label="理论重量" value={results.weight} unit="kg" color="text-green-500" />
            <ResultCard label="截面面积" value={results.area} unit="mm²" />
            <ResultCard label="截面周长" value={results.perimeter} unit="mm" />
            <ResultCard label="总体积" value={results.volume} unit="m³" />
          </div>

          <div className="p-6 rounded-[2rem] bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20">
            <h4 className="text-xs font-bold uppercase mb-4 text-green-500">快速参考</h4>
            <ul className="text-xs space-y-3 text-[var(--text-muted)]">
              <li className="flex justify-between"><span>碳钢密度</span> <span>7.85 g/cm³</span></li>
              <li className="flex justify-between"><span>不锈钢密度</span> <span>7.93 g/cm³</span></li>
              <li className="flex justify-between"><span>铝材密度</span> <span>2.70 g/cm³</span></li>
              <li className="flex justify-between"><span>铜材密度</span> <span>8.90 g/cm³</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function DimensionInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-[var(--text-muted)] ml-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] focus:border-green-500/50 rounded-xl p-3 outline-none transition-all text-lg font-mono"
        placeholder="0.00"
      />
    </div>
  );
}

function ResultCard({ label, value, unit, color = "text-[var(--text-main)]" }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <div className="bg-[var(--bg-secondary)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm">
      <div className="text-xs text-[var(--text-muted)] mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-3xl font-black font-mono", color)}>{value}</span>
        <span className="text-sm text-[var(--text-muted)] font-medium">{unit}</span>
      </div>
    </div>
  );
}

function CostEngineerAI({ 
  onBack, theme, toggleTheme, fontSize, setFontSize,
  selectedModel, setSelectedModel, baseUrl, setBaseUrl, apiKey, setApiKey
}: { 
  onBack: () => void; theme: 'dark' | 'light'; toggleTheme: () => void; fontSize: number; setFontSize: (s: number) => void;
  selectedModel: string; setSelectedModel: (s: string) => void; baseUrl: string; setBaseUrl: (s: string) => void; apiKey: string; setApiKey: (s: string) => void;
}) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('cost_ai_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string; progress: number }[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setSessions([newSession, ...sessions]);
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

      if (!response.ok) throw new Error(`API 错误: ${response.status}`);
      
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
      toast.error(`发送失败: ${error.message}`);
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
              <div className="space-y-1">
                {MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      localStorage.setItem('gemini_selected_model', m.id);
                    }}
                    className={cn(
                      "w-full text-left p-2 rounded-lg text-xs transition-all border",
                      selectedModel === m.id 
                        ? "bg-red-600/10 border-red-500/50 text-red-400" 
                        : "bg-[var(--bg-hover)] border-transparent text-[var(--text-main)] hover:bg-[var(--border-color)]"
                    )}
                  >
                    <div className="font-medium truncate">{m.name}</div>
                  </button>
                ))}
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
                          <div key={i} className="flex items-center gap-1 text-[10px] bg-black/10 px-2 py-1 rounded">
                            <Paperclip size={10} /> {a.name}
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
  selectedModel, setSelectedModel, baseUrl, setBaseUrl, apiKey, setApiKey
}: { 
  onBack: () => void; theme: 'dark' | 'light'; toggleTheme: () => void; fontSize: number; setFontSize: (s: number) => void;
  selectedModel: string; setSelectedModel: (s: string) => void; baseUrl: string; setBaseUrl: (s: string) => void; apiKey: string; setApiKey: (s: string) => void;
}) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
