// Cloudflare Pages Function — general web proxy
export async function onRequest(context) {
  const url = new URL(context.request.url);

  // home page
  if (url.pathname === '/' || url.pathname === '') {
    return new Response(HOME_PAGE, {
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }

  // proxy endpoint: /go?url=...
  if (url.pathname === '/go') {
    let target = url.searchParams.get('url');
    if (!target) return new Response('no url', { status: 400 });
    if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

    let targetUrl;
    try { targetUrl = new URL(target); }
    catch { return new Response('bad url', { status: 400 }); }

    let resp;
    try {
      resp = await fetch(targetUrl.toString(), {
        headers: {
          'user-agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-GB,en;q=0.9'
        },
        redirect: 'follow'
      });
    } catch (e) {
      return new Response('fetch failed: ' + e.message, { status: 502 });
    }

    const contentType = resp.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      let html = await resp.text();
      const base = targetUrl.origin + targetUrl.pathname;
      html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${base}">`);
      html = html.replace(/(href|src)=["'](https?:\/\/[^"']+)["']/gi,
        (m, attr, u) => `${attr}="${url.origin}/go?url=${encodeURIComponent(u)}"`);
      return new Response(html, {
        headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' }
      });
    }

    return new Response(resp.body, {
      headers: {
        'content-type': contentType || 'application/octet-stream',
        'access-control-allow-origin': '*'
      }
    });
  }

  return new Response('not found', { status: 404 });
}

const HOME_PAGE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Docs</title>
<style>
  body{font-family:system-ui;background:#f4f4f4;margin:0;padding:2rem;display:flex;justify-content:center}
  .box{background:#fff;padding:2rem;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.08);width:100%;max-width:520px}
  h1{margin:0 0 .3rem;font-size:1.4rem;color:#1a1a1a}
  p{color:#777;font-size:.85rem;margin:0 0 1.2rem}
  input,button{font-size:1rem}
  input{width:100%;padding:.75rem;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;margin-bottom:.7rem}
  button{width:100%;padding:.8rem;background:#0066cc;color:#fff;border:none;border-radius:8px;font-weight:600}
</style></head>
<body><div class="box">
<h1>Docs</h1>
<p>load any site</p>
<form onsubmit="go(event)">
<input id="u" placeholder="example.com" autocomplete="off" autocapitalize="off" spellcheck="false" required>
<button>Open</button>
</form>
</div>
<script>
function go(e){
  e.preventDefault();
  var v=document.getElementById('u').value.trim();
  if(!v)return;
  location.href=location.origin+'/go?url='+encodeURIComponent(v);
}
</script>
</body></html>`;
