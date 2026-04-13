import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
// @ts-ignore
import dwg2dxfFactory from "dwg2dxf";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ dest: "uploads/" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CAD 转换 API
  app.post("/api/cad/convert", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "未上传文件" });
    }

    const { targetVersion } = req.body;
    const inputPath = req.file.path;

    try {
      console.log(`[CAD] Starting conversion for: ${req.file.originalname}, size: ${req.file.size} bytes, target: ${targetVersion}`);
      const dwgData = fs.readFileSync(inputPath);
      
      // @ts-ignore
      const factory = dwg2dxfFactory.default || dwg2dxfFactory;
      
      // 加载 WASM 二进制文件
      const wasmPath = path.join(__dirname, "node_modules/dwg2dxf/dist/dwg2dxf-wasm.wasm");
      const wasmBinary = fs.readFileSync(wasmPath);

      // 映射版本号
      const versionMap: Record<string, string> = {
        '2000': 'AC1015',
        '2004': 'AC1018',
        '2007': 'AC1021',
        '2010': 'AC1024',
        '2013': 'AC1027',
        '2018': 'AC1032',
        't3': 'AC1015' // T3 通常基于较旧版本
      };

      const versionArg = versionMap[targetVersion] || 'AC1015';
      
      const module = await factory({
        wasmBinary: wasmBinary,
        arguments: ['-v', versionArg, 'input.dwg', 'output.dxf'],
        print: (text: string) => console.log(`[CAD WASM] ${text}`),
        printErr: (text: string) => console.error(`[CAD WASM ERR] ${text}`)
      });
      
      const dwgUint8 = new Uint8Array(dwgData);
      module.FS.writeFile("input.dwg", dwgUint8);
      
      // 调用转换函数
      // @ts-ignore
      const result = module._dwg2dxf(); 
      
      // 检查输出文件
      let outputName = "output.dxf";
      if (!module.FS.analyzePath(outputName).exists && module.FS.analyzePath("a.dxf").exists) {
        outputName = "a.dxf";
      }

      if (module.FS.analyzePath(outputName).exists) {
        let dxfData = module.FS.readFile(outputName);
        
        // 尝试修复缺失 EOF 的问题
        const dxfString = Buffer.from(dxfData).toString('utf-8');
        if (!dxfString.trim().endsWith('EOF')) {
          const fixedDxf = dxfString.trim() + '\n  0\nEOF\n';
          dxfData = Buffer.from(fixedDxf, 'utf-8');
        }

        res.setHeader("Content-Type", "application/dxf");
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(req.file.originalname.replace(/\.dwg$/i, ".dxf"))}"`);
        res.send(Buffer.from(dxfData));
      } else {
        throw new Error(`转换失败：未生成输出文件 (错误码: ${result})`);
      }
    } catch (error: any) {
      console.error("[CAD Convert Error]", error);
      res.status(500).json({ error: `转换失败: ${error.message}` });
    } finally {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
  });

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
      // @ts-ignore - Using global fetch in Node 18+
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
        const errorData: any = await response.json().catch(() => ({}));
        return res.status(response.status).json({ 
          error: errorData?.error?.message || errorData?.error || `上游报错: ${response.statusText}` 
        });
      }

      // 设置流式响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 转发流
      // @ts-ignore
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
      console.error("[Proxy Fatal Error]", {
        message: error.message,
        stack: error.stack,
        apiUrl: apiUrl,
        model: model
      });
      res.status(500).json({ error: `代理请求失败: ${error.message} (请检查网络连接或 API 地址是否正确)` });
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
