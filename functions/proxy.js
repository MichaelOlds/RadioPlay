// functions/proxy.js
export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const targetUrl = searchParams.get("url"); // ?url=https://api.com/data

  if (!targetUrl) {
    return new Response("Missing 'url' parameter", { status: 400 });
  }

  const response = await fetch(targetUrl, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body,
  });

  const proxyResponse = new Response(response.body, response);
  proxyResponse.headers.set("Access-Control-Allow-Origin", "*");
  proxyResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  proxyResponse.headers.set("Access-Control-Allow-Headers", "*");

  return proxyResponse;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
