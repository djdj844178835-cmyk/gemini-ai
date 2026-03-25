export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
  // 确保以 /v1 结尾或根据通用规则处理
  let finalBaseUrl = baseUrlInput.replace(/\/+$/, "");
  const apiUrl = `${finalBaseUrl}/chat/completions`;

  console.log(`[Vercel Proxy] Requesting: ${apiUrl} | Model: ${model}`);

  // 3. 使用原生 fetch 发起请求，避免 SDK 兼容性问题
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 延长到 60 秒超时

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false, // 暂时关闭流式以确保稳定性
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("[Upstream Error]", response.status, data);
      const errorMsg = data?.error?.message || data?.error || response.statusText;
      
      if (response.status === 404) {
        return res.status(404).json({ error: `接口路径错误(404)。请检查 Base URL 是否多写或少写了 /v1。当前尝试地址: ${apiUrl}` });
      }
      if (response.status === 401) {
        return res.status(401).json({ error: "API Key 验证失败，请检查密钥是否正确。" });
      }
      return res.status(response.status).json({ error: `上游服务报错: ${errorMsg}` });
    }

    return res.status(200).json(data);

  } catch (error: any) {
    console.error("[Vercel Proxy Fatal Error]", error);
    
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: "请求超时：第三方 API 服务器响应过慢，请稍后再试或更换模型。" });
    }
    
    return res.status(500).json({ 
      error: `网络连接失败: ${error.message}。这通常是由于 Vercel 无法访问您的接口地址 ${apiUrl} 导致的，请检查地址是否填写正确。` 
    });
  }
}
