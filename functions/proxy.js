// functions/proxy.js
export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const id = searchParams.get("id"); // ?id=1, ?id=2, ...

  if (!id) {
    return new Response("Missing 'id' parameter", { status: 400 });
  }

  const allowedUrls = {
    "1": "https://www.kissfm.ua/podcast/podcast.xml",
    "2": "https://podcast.byduck.by/feed.xml"
  };

  const targetUrl = allowedUrls[id];

  if (!targetUrl) {
    return new Response("Invalid id", { status: 403 });
  }

  const response = await fetch(targetUrl);

  const proxyResponse = new Response(response.body, response);
  proxyResponse.headers.set("Access-Control-Allow-Origin", "*");
  proxyResponse.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  proxyResponse.headers.set("Access-Control-Allow-Headers", "*");

  return proxyResponse;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}
