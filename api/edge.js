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
    const url = new URL(req.url);
    
    // 当访问 localhost?proxySite=xxx 时，设置 cookie
    if (url.searchParams.has('proxySite')) {
        const proxySite = url.searchParams.get('proxySite');
        
        // 设置 cookie，并返回 200 响应
        const headers = new Headers();
        headers.set('Set-Cookie', `proxySite=${proxySite}; Path=/; HttpOnly; Max-Age=31536000;`);
        return new Response(`Proxy site set to ${proxySite}`, {
            status: 200,
            headers,
        });
    }

    // 从 cookie 中获取代理目标
    const cookies = parseCookies(req.headers.get('cookie'));
    const targetDomain = cookies.proxySite || 'https://localhost';

    // 获取请求的 url
    const requestedUrl = new URL(req.url);
    const urlWithParams = requestedUrl.search
        ? `${targetDomain}${requestedUrl.pathname}${requestedUrl.search}`
        : `${targetDomain}${requestedUrl.pathname}`;

    if (!requestedUrl) {
        return new Response('Missing url parameter', {
            status: 400,
        });
    }

    try {
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

        return new Response(responseBody, {
            status: response.status, // 保留目标响应的状态码
            headers: {
                'Content-Type': contentType,
                ...response.headers, // 转发目标 API 的响应头
            },
        });
    } catch (err) {
        console.error(`Error: ${err.message}`);
        return new Response('Internal Server Error', {
            status: 500,
        });
    }
}
