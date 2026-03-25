export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const { messages, model, baseUrl: requestBaseUrl, apiKey: requestApiKey } = await req.json();

    // 1. 获取并清理 API Key
    const apiKey = (requestApiKey || process.env.THIRD_PARTY_API_KEY || "sk-vU5dTGQDuUVDxoqI2E8tYOyQfG5a8tpEWEoe3csyQ9VNMmVB").trim();
    
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
      return new Response(JSON.stringify({ error: "未检测到有效的 API Key。请在设置中填写。" }), { status: 401 });
    }

    // 2. 规范化 Base URL
    let baseUrlInput = (requestBaseUrl || process.env.THIRD_PARTY_API_BASE_URL || "https://new.xiaweiliang.cn/v1").trim();
    if (!baseUrlInput.startsWith("http")) {
      baseUrlInput = `https://${baseUrlInput}`;
    }
    let finalBaseUrl = baseUrlInput.replace(/\/+$/, "");
    const apiUrl = `${finalBaseUrl}/chat/completions`;

    console.log(`[Vercel Edge Proxy] Requesting: ${apiUrl} | Model: ${model}`);

    // 3. 发起请求并支持流式传输
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true, // 开启流式传输
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || errorData?.error || response.statusText;
      return new Response(JSON.stringify({ error: `上游服务报错: ${errorMsg}` }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. 返回流式响应
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error("[Vercel Edge Fatal Error]", error);
    return new Response(JSON.stringify({ 
      error: `网络连接失败: ${error.message}。请检查您的接口地址是否正确。` 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
