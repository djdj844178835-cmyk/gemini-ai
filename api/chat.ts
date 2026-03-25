import OpenAI from "openai";

export default async function handler(req: any, res: any) {
  // Vercel 无服务器函数仅支持特定的 HTTP 方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, model, baseUrl: requestBaseUrl, apiKey: requestApiKey } = req.body;

    // 优先使用请求中的 Key，其次使用环境变量，最后使用默认值
    const apiKey = requestApiKey || process.env.THIRD_PARTY_API_KEY || "sk-vU5dTGQDuUVDxoqI2E8tYOyQfG5a8tpEWEoe3csyQ9VNMmVB";
    
    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
      return res.status(401).json({ error: "未检测到 API Key。请在左侧设置栏填写您的 sk-... 密钥。" });
    }

    // 清理 Base URL
    let finalBaseUrl = (requestBaseUrl || process.env.THIRD_PARTY_API_BASE_URL || "https://new.xiaweiliang.cn/v1").trim();
    if (!finalBaseUrl.startsWith("http")) {
      finalBaseUrl = `https://${finalBaseUrl}`;
    }
    finalBaseUrl = finalBaseUrl.replace(/\/+$/, "");
    finalBaseUrl = finalBaseUrl.replace(/\/chat\/completions$/, "");

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: finalBaseUrl,
      maxRetries: 1,
      timeout: 60000, // Vercel Hobby 计划限制为 10s，Pro 为 60s
    });

    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 4000,
      temperature: 0.7,
    });

    return res.status(200).json(response);
  } catch (error: any) {
    console.error("[Vercel Proxy Error]", error);
    
    const status = error.status || 500;
    let message = error.message || "Unknown proxy error";
    
    if (status === 404) {
      message = `接口地址(404)错误：请检查您的 Base URL 是否正确。`;
    } else if (status === 401) {
      message = "API Key 错误或已失效。";
    } else if (message.includes('Unexpected token <')) {
      message = "上游接口返回了 HTML 而非 JSON。请检查 Base URL 是否填写正确（应为 API 地址而非网页地址）。";
    }
    
    return res.status(status).json({ error: message });
  }
}
