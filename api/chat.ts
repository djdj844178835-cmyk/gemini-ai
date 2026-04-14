import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, model, baseUrl: requestBaseUrl, apiKey: requestApiKey } = req.body;

    // 1. 获取并清理 API Key
    const apiKey = (requestApiKey || process.env.THIRD_PARTY_API_KEY || "sk-vU5dTGQDuUVDxoqI2E8tYOyQfG5a8tpEWEoe3csyQ9VNMmVB").trim();
    
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
      return res.status(401).json({ error: "未检测到有效的 API Key。请在设置中填写。" });
    }

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

    console.log(`[Vercel Proxy] Requesting: ${apiUrl} | Model: ${model}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    // 3. 发起请求并支持流式传输
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // @ts-ignore
      signal: controller.signal,
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || errorData?.error || response.statusText;
      return res.status(response.status).json({ error: `上游服务报错: ${errorMsg}` });
    }

    // 4. 返回流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!response.body) {
      return res.status(500).json({ error: "无法读取上游流" });
    }

    // @ts-ignore
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();

  } catch (error: any) {
    console.error("[Vercel Proxy Fatal Error]", error);
    let detail = error.message;
    if (error.name === 'AbortError') {
      detail = "请求超时 (60s)，请稍后重试或更换模型。";
    } else if (error instanceof TypeError && error.message === 'fetch failed') {
      detail = "无法连接到 API 服务器，请检查 Base URL 是否正确。";
    }
    res.status(500).json({ 
      error: `网络连接失败: ${detail}` 
    });
  }
}
