import OpenAI from "openai";

export const config = {
  maxDuration: 60, // 增加超时时间
};

export default async function handler(req: any, res: any) {
  // 仅允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, model, baseUrl: requestBaseUrl, apiKey: requestApiKey } = req.body;

    // 密钥获取逻辑：请求参数 > 环境变量 > 默认硬编码
    const apiKey = (requestApiKey || process.env.THIRD_PARTY_API_KEY || "sk-vU5dTGQDuUVDxoqI2E8tYOyQfG5a8tpEWEoe3csyQ9VNMmVB").trim();
    
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
      return res.status(401).json({ error: "未检测到有效的 API Key。请检查设置。" });
    }

    // 规范化 Base URL
    let baseUrlInput = (requestBaseUrl || process.env.THIRD_PARTY_API_BASE_URL || "https://new.xiaweiliang.cn/v1").trim();
    
    // 自动修正常见的 URL 错误
    if (!baseUrlInput.startsWith("http")) {
      baseUrlInput = `https://${baseUrlInput}`;
    }
    
    // 移除末尾多余的路径，OpenAI SDK 会自动处理 /chat/completions
    let finalBaseUrl = baseUrlInput
      .replace(/\/+$/, "")
      .replace(/\/chat\/completions$/, "");

    console.log(`[Vercel Proxy] Attempting to connect to: ${finalBaseUrl} with model: ${model}`);

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: finalBaseUrl,
      maxRetries: 0, // 减少重试以避免触发 Vercel 超时
      timeout: 25000, // 设置一个合理的超时
    });

    try {
      const response = await openai.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.7,
      });

      return res.status(200).json(response);
    } catch (apiError: any) {
      console.error("[Upstream API Error]", apiError);
      
      // 区分是网络连接错误还是 API 逻辑错误
      if (apiError.code === 'ENOTFOUND' || apiError.code === 'ECONNREFUSED') {
        return res.status(502).json({ error: `无法连接到接口服务器 (${finalBaseUrl})，请检查接口地址是否填写正确。` });
      }
      
      if (apiError.status === 401) {
        return res.status(401).json({ error: "API Key 错误或已失效，请检查您的密钥。" });
      }

      throw apiError; // 抛给外层处理
    }
  } catch (error: any) {
    console.error("[Vercel Proxy Error]", error);
    
    const status = error.status || 500;
    let message = error.message || "Internal Server Error";
    
    if (status === 404) {
      message = "接口地址(404)错误：请检查 Base URL 是否正确。";
    } else if (message.includes('Unexpected token <')) {
      message = "上游接口返回了非 JSON 内容。请检查 Base URL 是否填成了网页地址。";
    }
    
    return res.status(status).json({ error: message });
  }
}
