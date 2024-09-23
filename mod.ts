const TOKEN = Deno.env.get("TOKEN");

async function handler(request: Request): Promise<Response> {
  const tokenHeader = request.headers.get("Authorization");

  // トークンが環境変数 TOKEN と一致しなければ 403 Forbidden を返す
  if (tokenHeader !== `Bearer ${TOKEN}`) {
    return new Response("Forbidden", { status: 403 });
  }

  // CORS のヘッダーをセット
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  });

  // OPTIONS メソッドは CORS の事前検証リクエストのため、204 No Content を返す
  if (request.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  // パス部分からターゲットのURLを取得
  const urlPath = new URL(request.url).pathname.substring(1); // `/`を削除
  const targetUrl = decodeURIComponent(urlPath);

  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    return new Response("Invalid URL", { status: 400 });
  }

  try {
    // 元のリクエストヘッダーから Authorization を除去
    const filteredHeaders = new Headers(request.headers);
    filteredHeaders.delete("Authorization");

    // 対象のURLにリクエストを転送
    const proxyResponse = await fetch(targetUrl, {
      method: request.method,
      headers: filteredHeaders,
      body: request.body,
    });

    // プロキシレスポンスに CORS ヘッダーを追加して返す
    proxyResponse.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    const responseBody = await proxyResponse.arrayBuffer();
    return new Response(responseBody, {
      status: proxyResponse.status,
      headers,
    });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

// サーバーを起動
Deno.serve(handler);
