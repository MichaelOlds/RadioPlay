// functions/universal.js
export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const streamUrl = searchParams.get("url");

  if (!streamUrl) {
    return new Response("Missing 'url' parameter", { status: 400 });
  }

  const response = await fetch(streamUrl, {
    headers: { "Icy-MetaData": "1" }
  });

  // 1. Пробуємо ICY-заголовки
  const icyHeaders = {};
  response.headers.forEach((value, key) => {
    icyHeaders[key] = value;
  });

  if (icyHeaders["icy-name"] || icyHeaders["icy-genre"] || icyHeaders["icy-url"]) {
    return new Response(JSON.stringify(icyHeaders), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  // 2. Пробуємо JSON
  try {
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (e) {
    // 3. Пробуємо текст/HTML
    const text = await response.text();
    return new Response(JSON.stringify({ raw: text.slice(0, 500) }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
