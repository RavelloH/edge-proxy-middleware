export const config = {
  runtime: 'edge',
};

export default async function handler(req, res) {
  const requestedUrl = new URL(req.url, 'http://localhost').searchParams.get('url');
  const setRootUrl = new URL('/set-root', 'http://localhost');

  if (!requestedUrl) {
    const root = req.cookies.root;
    if (root) {
      res.setHeader('Content-Type', 'text/html');
      return new Response(`<h1>Welcome to the API</h1><p>Your root URL is set to ${root}</p>`, { status: 200 });
    } else {
      res.setHeader('Content-Type', 'text/html');
      return new Response(`
        <h1>Welcome to the API</h1>
        <p>Please set your root URL:</p>
        <form action="${setRootUrl.pathname}" method="post">
          <input type="text" name="root" placeholder="Enter your root URL">
          <button type="submit">Set Root</button>
        </form>
      `, { status: 200 });
    }
  }

  if (req.method === 'POST' && req.url === setRootUrl.pathname) {
    const urlParams = new URLSearchParams(await req.text());
    const root = urlParams.get('root') || urlParams.get('url');
    if (root) {
      res.setHeader('Set-Cookie', `root=${root}`);
      res.setHeader('Content-Type', 'text/html');
      return new Response(`<p>Root URL set to ${root}</p>`, { status: 200 });
    }
  }

  try {
    const root = req.cookies.root;
    const targetUrl = new URL(requestedUrl);
    if (root) {
      targetUrl.hostname = root;
    }
    const response = await fetch(targetUrl.toString());
    const contentType = response.headers.get('content-type');
    const headers = { 'Content-Type': contentType };

    return new Response(response.body, { headers });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return new Response('Internal Server Error', { status: 500 });
  }
}
