# TEMPORAL: auditoría de solo lectura de tres miniwebs Premium ante buscadores y asistentes de IA.
# No ejecuta JavaScript (lee el HTML como lo recibe un rastreador) y no envía eventos de estadísticas.
import json, re, urllib.request, urllib.error, html as H
B = "https://podcastdelmigrante.com"
PERFILES = ["1juanromero1", "tomas-velazquez", "carlos-d-castillo", "santa-latino"]
UAS = {
  "Navegador": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  "Googlebot": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Bingbot": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "GPTBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
  "OAI-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)",
  "ChatGPT-User": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0; +https://openai.com/bot)",
  "ClaudeBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  "PerplexityBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
}
def pedir(url, ua):
    req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept": "text/html,*/*"})
    try:
        r = urllib.request.urlopen(req, timeout=60); return r.status, dict(r.headers), r.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "ignore")
    except Exception as e:
        return 0, {}, str(e)
out = []
def p(x): out.append(x); print(x)
g = lambda h, re_: (re.search(re_, h, re.S) or [None, "-"])[1]
for s in PERFILES:
    u = f"{B}/perfil-{s}"
    p(f"\n=== {u}")
    for n, ua in (UAS.items() if s == "1juanromero1" else [("Navegador", UAS["Navegador"])]):
        st, hd, body = pedir(u, ua)
        hl = {k.lower(): v for k, v in hd.items()}
        p(f"  {n:13} HTTP {st} | {len(body)} bytes | x-robots-tag {hl.get('x-robots-tag','-')} | cf-mitigated {hl.get('cf-mitigated','-')} | título «{H.unescape(g(body, r'<title>([^<]*)'))[:60]}»")
    st, hd, h = pedir(u, UAS["Navegador"])
    open(f"/tmp/out/prod-perfil-{s}.html", "w", encoding="utf-8").write(h)
    repo = open(f"perfil-{s}.html", encoding="utf-8").read()
    p(f"  canónica: {g(h, r'rel=\"canonical\" href=\"([^\"]+)\"')} | robots meta: {g(h, r'<meta name=\"robots\" content=\"([^\"]+)\"')}")
    p(f"  description: «{H.unescape(g(h, r'name=\"description\" content=\"([^\"]*)\"'))}»")
    lds = [json.loads(m) for m in re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', h, re.S)]
    for d in lds:
        me = d.get("mainEntity", {})
        p(f"  JSON-LD {d.get('@type')} → mainEntity {me.get('@type')} «{me.get('name')}» | tel {me.get('telephone','-')} | email {me.get('email','-')} | servicios {len(me.get('makesOffer', []))} | dirección {json.dumps(me.get('address') or (me.get('worksFor') or {}).get('address') or (me.get('workLocation') or {}).get('address'), ensure_ascii=False)}")
    texto = " ".join(H.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"(?s)<(script|style|noscript)[^>]*>.*?</\1>", " ", g(h, r"(<main[\s\S]*?</main>)")))).split())
    p(f"  texto visible sin JavaScript: {len(texto.split())} palabras")
    p(f"  correos ofuscados por Cloudflare: {len(re.findall('__cf_email__|/cdn-cgi/l/email-protection', h))} | «[email protected]» en el texto: {texto.count('[email')}")
    limpia = lambda x: re.sub(r'<script data-cfasync="false" src="/cdn-cgi/[^"]+"></script>', "", re.sub(r'href="/cdn-cgi/l/email-protection#[0-9a-f]+"', 'href="MAIL"', re.sub(r'<span class="__cf_email__"[^>]*>\[email&#160;protected\]</span>', "EMAIL", x)))
    norm_repo = re.sub(r'href="mailto:[^"]*"', 'href="MAIL"', repo)
    norm_repo = re.sub(r'(?<=>)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}(?=<)', "EMAIL", norm_repo)
    p(f"  HTML de producción = repositorio (salvo ofuscación de correos): {limpia(h) == norm_repo}")
    p(f"  texto: {texto[:1500]}")
# Variantes de la URL de Juan (sin seguir redirecciones)
class NoRedir(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
op = urllib.request.build_opener(NoRedir)
for v in ["/perfil-1juanromero1.html", "/perfil-1juanromero1/", "/business-profile?slug=1juanromero1", "/business-profile.html?slug=1juanromero1", "/perfil-1JuanRomero1"]:
    try:
        r = op.open(urllib.request.Request(B + v, headers={"User-Agent": UAS["Navegador"]}), timeout=60); p(f"  variante {v}: {r.status}")
    except urllib.error.HTTPError as e:
        p(f"  variante {v}: {e.code} → {e.headers.get('Location','-')}")
for path in ["/robots.txt", "/sitemap.xml", "/quien-puede-ayudarte"]:
    st, hd, body = pedir(B + path, UAS["Navegador"])
    hl = {k.lower(): v for k, v in hd.items()}
    p(f"\n=== {path}: HTTP {st} | content-type {hl.get('content-type','-')} | {len(body)} bytes")
    if path == "/robots.txt":
        p(body); p(f"  robots.txt idéntico al del repositorio: {body == open('robots.txt').read()}")
    if path == "/sitemap.xml":
        for s in PERFILES: p(f"  {s}: {'en el sitemap' if f'<loc>{B}/perfil-{s}</loc>' in body else 'NO está en el sitemap'} | lastmod {g(body, rf'<loc>{re.escape(B)}/perfil-{s}</loc>\s*<lastmod>([^<]+)')}")
    if path == "/quien-puede-ayudarte":
        for s in PERFILES: p(f"  enlace a perfil-{s} en el HTML del directorio: {('href=\"perfil-' + s + '\"') in body or ('href=\"/perfil-' + s + '\"') in body}")
open("/tmp/out/miniweb-juan.txt", "w").write("\n".join(out))
