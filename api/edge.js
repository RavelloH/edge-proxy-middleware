export const config = {
    runtime: 'edge',
};

// 解析 cookies
function parseCookies(cookieString) {
  const cookies = {};
  if (cookieString) {
    cookieString.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts[0].trim();
      const value = parts[1].trim();
      cookies[name] = value;
    });
  }
  return cookies;
}

// 处理请求
export default async function handler(req) {
    const targetDomain = parseCookies(req.headers.cookie).root || 'https://localhost';
    
    // 解析原始请求的 URL，确保查询参数被正确转发
    const requestedUrl = new URL(req.url, 'http://localhost');
    const urlWithParams = requestedUrl.search
        ? `${targetDomain}${requestedUrl.pathname}${requestedUrl.search}`
        : `${targetDomain}${requestedUrl.pathname}`;

    // 如果缺少 URL 参数
    if (!requestedUrl) {
        return new Response('Missing url parameter', {
            status: 400,
        });
    }

    try {
        // 发起请求到目标 API
        const response = await fetch(urlWithParams, {
            method: req.method, // 保留原请求方法
            headers: {
                ...req.headers, // 转发原请求的头部信息
            },
        });

        const contentType = response.headers.get('content-type');
        let responseBody;

        // 根据 content-type 处理不同响应体
        if (contentType && contentType.includes('application/json')) {
            responseBody = await response.json();
        } else if (contentType && contentType.includes('text')) {
            responseBody = await response.text();
        } else {
            responseBody = response.body;
        }

        // 返回转发的响应
        return new Response(responseBody, {
            status: response.status, // 保留目标响应的状态码
            headers: {
                'Content-Type': contentType,
                ...response.headers, // 转发目标 API 的响应头
            },
        });
    } catch (err) {
        // 捕获错误并输出日志
        console.error(`Error: ${err.message}`);
        return new Response('Internal Server Error', {
            status: 500,
        });
    }
}
