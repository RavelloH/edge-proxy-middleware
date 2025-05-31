<!-- https://github.com/RavelloH/edge-proxy-middleware -->
# edge-proxy-middleware
基于edge-function的代理API，全网最强大的在线代理，可处理任何相对路径。  

## 特性
- 基于边缘网络，始终选择距你最近的可用区，延迟低；
- edge-function无需冷启动，响应快；
- 可路径完全相同的复制代理任意站点，可处理相对路径；
- 可使用Vercel或Cloudflare Workers部署，免费；

## 一键部署

### Vercel部署
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRavelloH%2Fedge-proxy-middleware)

### Cloudflare Workers部署
复制`cloudflare/worker.js`文件内容到Cloudflare Workers编辑器中即可。

## 使用示例(以github.com为例)  
简单来说，在要代理的域名前加上此API的地址即可。  

https://bridge.ravelloh.top/github.com  
https://bridge.ravelloh.top/https://github.com  
https://bridge.ravelloh.top/api/edge?url=https://github.com

通过以上三种格式之一访问后，会自动识别到代理主机名`github.com` ，并写入到cookie:site中。

之后路径将与`github.com`完全对应,即:
```
https://bridge.ravelloh.top <===> https://github.com
https://bridge.ravelloh.top/RavelloH <===> https://github.com/RavelloH
```

要更改代理主机名，只需访问一个新主机名，例如`https://bridge.ravelloh.top/ravelloh.top`。

## 注意事项
**强烈建议** 你自己部署此API。毕竟直接用这个API demo会耗我的Vercel额度，使用量多时不保证可用性。  
Cookie一天后过期，届时请重新输入主机名。  
尽管架构上完全可以用于代理任意网站，但本API的主要用途是代理API。  
部分网站可能会将edge function的服务器IP段视为爬虫而造成访问异常。

