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

export default async function handler(req) {
  console.log("url:", req.url);

  const cookies = parseCookies(req.headers.get("cookie"));
  let targetDomain = cookies.site || "https://localhost";
  console.log("targetDomain:", targetDomain);

  const url = new URL(req.url, "http://localhost");
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
      .replace("https://")
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
  const forwardedHeaders = {};
  for (const [key, value] of req.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (!["host", "connection", "content-length"].includes(lowerKey)) {
      forwardedHeaders[key] = value;
    }
  }

  try {
    const proxyResponse = await fetch(requestedUrl, {
      method: req.method,
      headers: forwardedHeaders,
      body:
        req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    });

    const contentType = proxyResponse.headers.get("content-type") || "text/plain";
    const headers = {
      "Content-Type": contentType,
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
        },
      }
    );
  }
}
