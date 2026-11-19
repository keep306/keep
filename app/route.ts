import html from "../content/home.html?raw";
export async function GET() { return new Response(html, {headers:{"content-type":"text/html; charset=utf-8", "cache-control":"no-cache"}}); }
