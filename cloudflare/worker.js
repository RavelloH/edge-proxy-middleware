function parseCookies(cookieString) {
  const cookies = {};
  if (cookieString) {
    cookieString.split(";").forEach((cookie) => {
      const parts = cookie.split("=");
      const name = parts[0].trim();
      const value = parts[1] ? parts[1].trim() : "";
      cookies[name] = value;
    });
  }
  return cookies;
}

// 实现vercel.json中的重定向逻辑
function handleRewrites(url) {
  const pathname = url.pathname;
  
  // 处理根路径
  if (pathname === "/") {
    return "/api/edge?url=/";
  }
  
  // 处理 https: 或 http: 开头的路径
  const protocolMatch = pathname.match(/^\/(https?:)\/(.+)/);
  if (protocolMatch) {
    const protocol = protocolMatch[1];
    const site = protocolMatch[2];
    return `/api/edge?url=${protocol}//${site}`.replace("///", "//");
  }
  
  // 处理以斜杠结尾的路径
  if (pathname.endsWith("/") && pathname !== "/") {
    const site = pathname.slice(1, -1);
    return `/api/edge?url=http://${site}/`.replace("///", "//");
  }
  
  // 处理其他路径
  if (pathname !== "/" && !pathname.startsWith("/api/")) {
    const site = pathname.slice(1);
    return `/api/edge?url=http://${site}`;
  }
  
  return null;
}

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // 检查是否需要重定向
  const rewritePath = handleRewrites(url);
  if (rewritePath && !url.pathname.startsWith("/api/edge")) {
    // 重写URL
    const newUrl = new URL(rewritePath, url.origin);
    // 保留原始查询参数
    for (const [key, value] of url.searchParams.entries()) {
      newUrl.searchParams.append(key, value);
    }
    url.pathname = newUrl.pathname;
    url.search = newUrl.search;
  }
  
  // 如果不是API路径，返回404
  if (!url.pathname.startsWith("/api/edge")) {
    return new Response("Not Found", { status: 404 });
  }
  
  console.log("url:", url.toString());

  const cookies = parseCookies(request.headers.get("cookie"));
  let targetDomain = cookies.site || "https://localhost";
  console.log("targetDomain:", targetDomain);

  const path = url.pathname;
  let requestedUrl = url.searchParams.get("url");
  let setCookie = false;
  let hostFromUrl = "";

  if (requestedUrl) {
    if (requestedUrl === "/" && targetDomain === "https://localhost") {
      requestedUrl =
        "https://raw.githubusercontent.com/RavelloH/edge-proxy-middleware/main/README.md";
    }
    try {
      if (
        requestedUrl.match(
          /^https?:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(\:[0-9]+)?(\/|$)/
        ) &&
        !requestedUrl.match(
          /^https?:\/\/[^\/]+\.(jpg|jpeg|png|gif|svg|webp|ico|css|js)$/i
        )
      ) {
        const urlObj = new URL(requestedUrl);
        hostFromUrl = urlObj.protocol + "//" + urlObj.host;

        if (hostFromUrl !== targetDomain) {
          targetDomain = hostFromUrl;
          setCookie = true;
        }
      } else {
        if (requestedUrl.startsWith("/")) {
          requestedUrl = requestedUrl.substring(1);
        }
        requestedUrl = `${targetDomain}/${requestedUrl
          .replace("https://", "")
          .replace("http://", "")}`;
      }
    } catch (error) {
      console.error("URL处理错误:", error);
      if (requestedUrl.startsWith("/")) {
        requestedUrl = requestedUrl.substring(1);
      }
      requestedUrl = `${targetDomain}/${requestedUrl}`;
    }
  } else {
    requestedUrl = `${targetDomain}${path
      .replace("https://", "")
      .replace("http://", "")}`;
    console.log("Using path from current URL:", path);
  }

  const originalQueryParams = new URLSearchParams(url.search);
  const newQueryParams = new URLSearchParams();

  for (const [key, value] of originalQueryParams.entries()) {
    if (key !== "url" && key !== "site") {
      newQueryParams.append(key, value);
    }
  }

  const queryString = newQueryParams.toString();
  if (queryString && !requestedUrl.includes("?")) {
    requestedUrl += "?" + queryString;
  } else if (queryString) {
    requestedUrl += "&" + queryString;
  }

  requestedUrl = decodeURIComponent(requestedUrl);
  console.log("requestedUrl:", requestedUrl);

  if (!requestedUrl) {
    return new Response("Missing url parameter and no site cookie set", {
      status: 400,
    });
  }

  // 转发请求头
  const forwardedHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (!["host", "connection", "content-length", "cf-ray", "cf-connecting-ip"].includes(lowerKey)) {
      forwardedHeaders.set(key, value);
    }
  }

  try {
    const proxyResponse = await fetch(requestedUrl, {
      method: request.method,
      headers: forwardedHeaders,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    });

    const contentType = proxyResponse.headers.get("content-type") || "text/plain";
    const headers = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
    };

    if (setCookie && hostFromUrl) {
      headers["Set-Cookie"] = `site=${hostFromUrl}; path=/; max-age=86400; SameSite=Strict`;
    }

    return new Response(proxyResponse.body, {
      status: proxyResponse.status,
      headers,
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: err.message,
        cookies: cookies,
        targetDomain: targetDomain,
        url: requestedUrl,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// Cloudflare Workers事件监听器
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});
