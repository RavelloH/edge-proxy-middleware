export const config = {
  runtime: "edge",
};

function parseCookies(cookieString) {
  const cookies = {};
  if (cookieString) {
    cookieString.split(";").forEach((cookie) => {
      const parts = cookie.split("=");
      const name = parts[0].trim();
      const value = parts[1].trim();
      cookies[name] = value;
    });
  }
  return cookies;
}

export default async function handler(req, res) {
  console.log("url:", req.url);
  const targetDomain =
    parseCookies(req.headers.cookie).root || "https://localhost";

  // 解析请求 URL
  const url = new URL(req.url, "http://localhost");
  let requestedUrl = url.searchParams.get("url");

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
    return new Response("Missing url parameter", {
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

    return new Response(response.body, {
      headers,
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return new Response("Internal Server Error", {
      status: 500,
    });
  }
}
