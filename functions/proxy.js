// functions/song.js
export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const streamUrl = searchParams.get("url"); // ?url=http://radio-stream.com/live

  if (!streamUrl) {
    return new Response("Missing 'url' parameter", { status: 400 });
  }

  // Запит із заголовком для отримання ICY-метаданих
  const response = await fetch(streamUrl, {
    headers: { "Icy-MetaData": "1" }
  });

  // Витягуємо всі заголовки
  const icyHeaders = {};
  response.headers.forEach((value, key) => {
    icyHeaders[key] = value;
  });

  // Беремо лише StreamTitle (поточна пісня)
  const songInfo = icyHeaders["icy-metaint"] || icyHeaders["x-stream-title"] || icyHeaders["streamtitle"];

  return new Response(JSON.stringify({ song: songInfo || "Unknown" }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
