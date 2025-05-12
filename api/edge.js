export const config = {
  runtime: "edge",
};

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

export default async function handler(req, res) {
  console.log("url:", req.url);

  // 解析cookies
  const cookies = parseCookies(req.headers.get("cookie"));
  const url = new URL(req.url, "http://localhost");
  
  // 检查是否有site查询参数，优先使用它
  const siteParam = url.searchParams.get("site");
  let targetDomain = siteParam || cookies.site || "https://localhost";
  
  // 确保targetDomain是有效的URL格式
  if (!targetDomain.startsWith('http://') && !targetDomain.startsWith('https://')) {
    targetDomain = 'https://' + targetDomain;
  }
  
  console.log("targetDomain:", targetDomain);

  const path = url.pathname;
  let requestedUrl = url.searchParams.get("url");
  let setCookie = false;
  let hostFromUrl = "";

  // 如果提供了url参数，尝试解析
  if (requestedUrl) {
    try {
      // 使用更严格的正则表达式验证是否为有效的完整URL
      // 确保域名至少包含一个点且不以点结尾
      if (
        requestedUrl.match(
          /^https?:\/\/([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:[0-9]+)?/
        )
      ) {
        // 是完整URL，提取主机名
        const urlObj = new URL(requestedUrl);
        hostFromUrl = urlObj.protocol + "//" + urlObj.host;

        // 如果主机名与cookie中的不同，更新cookie
        if (hostFromUrl !== targetDomain) {
          targetDomain = hostFromUrl;
          setCookie = true;
        }
      } else {
        // 是相对路径或不完整URL，使用targetDomain组合
        // 移除开头的斜杠以避免重复
        if (requestedUrl.startsWith("/")) {
          requestedUrl = requestedUrl.substring(1);
        }
        // 确保移除任何协议前缀
        requestedUrl = requestedUrl.replace(/^https?:\/\//, "");
        requestedUrl = `${targetDomain}/${requestedUrl}`;
      }
    } catch (error) {
      console.error("URL处理错误:", error);
      // 如果URL解析出错，尝试作为相对路径处理
      if (requestedUrl.startsWith("/")) {
        requestedUrl = requestedUrl.substring(1);
      }
      requestedUrl = requestedUrl.replace(/^https?:\/\//, "");
      requestedUrl = `${targetDomain}/${requestedUrl}`;
    }
  } else {
    // 没有URL参数，使用当前路径与targetDomain组合
    const cleanPath = path.replace(/^https?:\/\//, "");
    requestedUrl = `${targetDomain}${cleanPath}`;
    console.log("Using path from current URL:", path);
  }

  // 获取所有查询参数
  const originalQueryParams = new URLSearchParams(url.search);
  const newQueryParams = new URLSearchParams();

  // 复制除了 url 以外的所有查询参数
  for (const [key, value] of originalQueryParams.entries()) {
    if (key !== "url" && key !== "site") {
      newQueryParams.append(key, value);
    }
  }

  // 构建完整的请求 URL，包含原始查询参数
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

  console.log("Requested URL:", requestedUrl); // 调试输出

  try {
    // 通过解码后的 URL 发起请求
    const response = await fetch(requestedUrl);
    const contentType = response.headers.get("content-type");
    const headers = {
      "Content-Type": contentType,
    };

    // 如果需要设置cookie，添加到响应头中
    if (setCookie && hostFromUrl) {
      headers[
        "Set-Cookie"
      ] = `site=${hostFromUrl}; path=/; max-age=86400; SameSite=Strict`;
    }

    return new Response(response.body, {
      headers,
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    // 返回更详细的错误处理

    //   return new Response("Internal Server Error", {
    //     status: 500,
    //   });
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
        },
      }
    );
  }
}
