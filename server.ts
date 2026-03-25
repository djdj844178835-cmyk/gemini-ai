import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Initialize OpenAI client with the third-party key
  // The user provided: sk-vU5dTGQDuUVDxoqI2E8tYOyQfG5a8tpEWEoe3csyQ9VNMmVB
  const apiKey = process.env.THIRD_PARTY_API_KEY || "sk-vU5dTGQDuUVDxoqI2E8tYOyQfG5a8tpEWEoe3csyQ9VNMmVB";
  const baseURL = process.env.THIRD_PARTY_API_BASE_URL || "https://api.openai.com/v1"; // Default to OpenAI, user can change

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  // API Route for Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model, baseUrl: requestBaseUrl, apiKey: requestApiKey } = req.body;

      // Use request's API Key if provided, otherwise fallback to env
      const finalApiKey = requestApiKey || apiKey;
      
      if (!finalApiKey || finalApiKey === "undefined" || finalApiKey.trim() === "") {
        return res.status(401).json({ error: "未检测到 API Key。请在左侧设置栏填写您的 sk-... 密钥。" });
      }

      // Clean up Base URL: remove trailing slashes and /chat/completions if present
      let finalBaseUrl = (requestBaseUrl || process.env.THIRD_PARTY_API_BASE_URL || "https://new.xiaweiliang.cn/v1").trim();
      if (!finalBaseUrl.startsWith("http")) {
        finalBaseUrl = `https://${finalBaseUrl}`;
      }
      finalBaseUrl = finalBaseUrl.replace(/\/+$/, ""); // Remove trailing slashes
      finalBaseUrl = finalBaseUrl.replace(/\/chat\/completions$/, ""); // Remove accidental full endpoint
      
      console.log(`[Proxy] Requesting model: ${model} at ${finalBaseUrl}`);

      const dynamicOpenai = new OpenAI({
        apiKey: finalApiKey,
        baseURL: finalBaseUrl,
        maxRetries: 1,
        timeout: 60000, // 60s timeout
      });

      const response = await dynamicOpenai.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.7,
      });

      res.json(response);
    } catch (error: any) {
      console.error("[Proxy Error]", {
        message: error.message,
        status: error.status,
        name: error.name,
        stack: error.stack
      });
      
      const status = error.status || 500;
      let message = error.message || "Unknown proxy error";
      
      if (status === 404) {
        message = `接口地址(404)错误：请检查您的 Base URL 是否正确。当前尝试访问的地址可能不支持该模型或路径不正确。建议点击左侧“恢复默认设置”重试。`;
      } else if (status === 401) {
        message = "API Key 错误或已失效。请确认您在左侧填写的 sk-... 密钥是否正确。";
      } else if (status === 413) {
        message = "文件或提示词内容过大 (413)。请尝试减小图片尺寸或缩短文本长度。";
      } else if (error.name === 'OpenAIError' && message.includes('Unexpected token <')) {
        message = "上游接口返回了 HTML 而非 JSON。这通常意味着您的 Base URL 填写错误（例如填成了网页地址而非 API 地址）。请检查 Base URL。";
      }

      res.status(status).json({ error: message });
    }
  });

  // Catch-all for other /api routes to prevent falling through to SPA handler
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API 路由未找到: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
