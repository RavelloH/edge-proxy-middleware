export const config = {
  runtime: 'edge',
};

export default async function handler(req, res) {
  const requestedUrl = new URL(req.url, 'http://localhost').searchParams.get('url');

  if (!requestedUrl) {
    res.statusCode = 400;
    res.end('Missing url parameter');
    return;
  }

  try {
    const response = await fetch(requestedUrl);
    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType);

    response.body.pipe(res);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}