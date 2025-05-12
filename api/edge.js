export const config = {
    runtime: 'edge',
};

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

export default async function handler(req, res) {
    console.log("url:",req.url)
    const targetDomain = parseCookies(req.headers.cookie).root || 'https://localhost';
    
    // 获取传递的 url 参数，并解码它
    const requestedUrl = decodeURIComponent(new URL(req.url, 'http://localhost').searchParams.get('url'));
    console.log("requestedUrl:",requestedUrl)

    if (!requestedUrl) {
        return new Response('Missing url parameter', {
            status: 400
        });
    }

    console.log('Requested URL:', requestedUrl); // 调试输出

    try {
        // 通过解码后的 URL 发起请求
        const response = await fetch(requestedUrl);
        const contentType = response.headers.get('content-type');
        const headers = {
            'Content-Type': contentType
        };

        return new Response(response.body, {
            headers
        });
    } catch (err) {
        console.error(`Error: ${err.message}`);
        return new Response('Internal Server Error', {
            status: 500
        });
    }
}
