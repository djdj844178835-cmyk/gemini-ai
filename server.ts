import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API 代理路由
  app.post("/api/chat", async (req, res) => {
    const { messages, model, baseUrl: requestBaseUrl, apiKey: requestApiKey } = req.body;

    // 1. 获取并清理 API Key
    const apiKey = (requestApiKey || process.env.THIRD_PARTY_API_KEY || "sk-vU5dTGQDuUVDxoqI2E8tYOyQfG5a8tpEWEoe3csyQ9VNMmVB").trim();
    
    // 2. 规范化 Base URL
    let baseUrlInput = (requestBaseUrl || process.env.THIRD_PARTY_API_BASE_URL || "https://new.xiaweiliang.cn/v1").trim();
    if (!baseUrlInput.startsWith("http")) {
      baseUrlInput = `https://${baseUrlInput}`;
    }
    let finalBaseUrl = baseUrlInput.replace(/\/+$/, "");
    
    // 自动补全 /v1 (如果用户漏写)
    if (!finalBaseUrl.endsWith("/v1") && !finalBaseUrl.includes("/v1/")) {
      finalBaseUrl += "/v1";
    }
    
    const apiUrl = `${finalBaseUrl}/chat/completions`;

    console.log(`[Proxy] Requesting: ${apiUrl} | Model: ${model}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: true,
        }),
      });

      console.log(`[Proxy] Upstream status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ 
          error: errorData?.error?.message || errorData?.error || `上游报错: ${response.statusText}` 
        });
      }

      // 设置流式响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 转发流
      const reader = response.body?.getReader();
      if (!reader) {
        return res.status(500).json({ error: "无法读取上游流" });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();

    } catch (error: any) {
      console.error("[Proxy Fatal Error]", error);
      res.status(500).json({ error: `代理请求失败: ${error.message}` });
    }
  });

  // Vite 中间件
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
