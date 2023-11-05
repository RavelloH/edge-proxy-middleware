import {
    createProxyMiddleware
} from 'http-proxy-middleware';

export default function handler(req, res) {
    const {
        mainURL
    } = req.query;
    return createProxyMiddleware({
        target: mainURL,
        changeOrigin: true,
        selfHandleResponse: true,
        onProxyRes: (proxyRes, req, res) => {
            // 设置响应头
            res.setHeader('Content-Type', proxyRes.headers['content-type']);
            res.setHeader('Content-Length', proxyRes.headers['content-length']);

            // 使用流式传输将资源转发给用户
            proxyRes.pipe(res);
        },
    });

}