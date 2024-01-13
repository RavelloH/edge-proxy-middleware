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
    const targetDomain = parseCookies(req.headers.cookie).root || 'https://localhost'
    
    const requestedUrl = new URL(req.url, 'http://localhost').searchParams.get('url');

    if (!requestedUrl) {
        return new Response('Missing url parameter', {
            status: 400
        });
    }

    try {
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