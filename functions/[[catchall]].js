/**
 * Cloudflare Pages Function (catchall Worker)
 * Replaces server.js for Cloudflare Pages + Workers deployment.
 *
 * Handles:
 *  - All API endpoints (/api/login, /api/contact, /api/projects, /api/blogs)
 *  - SSR page rendering (/projects, /blogs, /Blog/:year/:slug, /sitemap.xml, etc.)
 *  - Clean URL routing (/about → about.html, etc.)
 *  - .well-known/ discovery endpoints
 *  - Session auth via KV (instead of in-memory Map)
 *  - Rate limiting via KV with TTL (instead of in-memory Map)
 *
 * Static assets (CSS, JS, PNG, HTML files served directly by file extension)
 * are handled by Cloudflare Pages CDN before this function is ever called,
 * as configured in _routes.json.
 *
 * env.DB       → Cloudflare KV namespace binding (stores db, sessions, rate limits)
 * env.ASSETS   → Cloudflare Pages Assets binding (lets us fetch static HTML templates)
 */

// ============================================================
// CONSTANTS
// ============================================================
const HOSTNAME = 'bhavyajangid.com';
const SESSION_COOKIE_NAME = 'session_id';
const PASSWORD_SALT = 'bhavya_salt_2026';
const SESSION_TTL_SECONDS = 86400; // 1 day
const LOGIN_BLOCK_TTL_SECONDS = 300; // 5 minutes
const CONTACT_COOLDOWN_SECONDS = 60; // 60 seconds

// MIME types map
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
};

// ============================================================
// CRYPTO HELPERS (Web Crypto API — available in Workers)
// ============================================================

/**
 * PBKDF2 password hash using SubtleCrypto (matches server.js behavior)
 */
async function pbkdf2Hash(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(salt), iterations: 1000, hash: 'SHA-512' },
        keyMaterial,
        512
    );
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Pre-computed password hash (computed lazily on first login)
let _passwordHash = null;
async function getPasswordHash() {
    if (!_passwordHash) {
        _passwordHash = await pbkdf2Hash('pink AP26 aircrack', PASSWORD_SALT);
    }
    return _passwordHash;
}

/** SHA-1 ETag */
async function sha1(buffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

/** Cryptographically secure random hex string */
function randomHex(bytes = 32) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// COOKIE HELPERS
// ============================================================

function getCookie(request, name) {
    const cookieHeader = request.headers.get('Cookie') || '';
    for (const part of cookieHeader.split(';')) {
        const [k, ...v] = part.trim().split('=');
        if (k.trim() === name) return decodeURIComponent(v.join('='));
    }
    return null;
}

// ============================================================
// DATABASE HELPERS (Cloudflare KV)
// ============================================================

async function readDatabase(env) {
    try {
        const raw = await env.KV.get('db');
        if (!raw) return { blogs: [], projects: [], contacts: [] };
        const parsed = JSON.parse(raw);
        if (!parsed.blogs) parsed.blogs = [];
        if (!parsed.projects) parsed.projects = [];
        if (!parsed.contacts) parsed.contacts = [];
        return parsed;
    } catch (e) {
        console.error('DB Read Error:', e);
        return { blogs: [], projects: [], contacts: [] };
    }
}

async function writeDatabase(env, db) {
    await env.KV.put('db', JSON.stringify(db, null, 2));
}

// ============================================================
// SESSION HELPERS (KV-backed, TTL = 1 day)
// ============================================================

async function isAuthorized(request, env) {
    const sid = getCookie(request, SESSION_COOKIE_NAME);
    if (!sid) return false;
    const val = await env.KV.get(`session:${sid}`);
    return val === '1';
}

async function createSession(env) {
    const sid = randomHex(32);
    await env.KV.put(`session:${sid}`, '1', { expirationTtl: SESSION_TTL_SECONDS });
    return sid;
}

// ============================================================
// RATE LIMITING HELPERS (KV-backed, TTL for expiry)
// ============================================================

async function getLoginAttempts(env, ip) {
    const raw = await env.KV.get(`login:${ip}`);
    return raw ? JSON.parse(raw) : { count: 0, blockUntil: 0 };
}

async function setLoginAttempts(env, ip, data, ttlSeconds) {
    await env.KV.put(`login:${ip}`, JSON.stringify(data), { expirationTtl: ttlSeconds });
}

async function getContactCooldown(env, ip) {
    const raw = await env.KV.get(`contact:${ip}`);
    return raw ? parseInt(raw, 10) : 0;
}

async function setContactCooldown(env, ip) {
    const now = Math.floor(Date.now() / 1000);
    await env.KV.put(`contact:${ip}`, String(now), { expirationTtl: CONTACT_COOLDOWN_SECONDS });
}

// ============================================================
// IP HELPER
// ============================================================

function getClientIp(request) {
    return (
        request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For') ||
        'unknown'
    );
}

// ============================================================
// HTML → MARKDOWN CONVERTER (mirrors server.js)
// ============================================================

function htmlToMarkdown(html) {
    if (!html) return '';
    let md = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
        .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
        .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '\n$1\n')
        .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '\n$1\n')
        .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    md = md.split('\n')
        .map(line => line.trim())
        .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
        .join('\n')
        .trim();

    return md;
}

// ============================================================
// LLM PROFILE + SITEMAP GENERATORS (pure string, no fs writes)
// ============================================================

function generateSitemap(db) {
    const today = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <url><loc>https://${HOSTNAME}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>\n`;
    xml += `  <url><loc>https://${HOSTNAME}/about</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>\n`;
    xml += `  <url><loc>https://${HOSTNAME}/projects</loc><lastmod>${today}</lastmod><priority>0.9</priority></url>\n`;
    xml += `  <url><loc>https://${HOSTNAME}/projects/hidden-agenda/</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>\n`;
    xml += `  <url><loc>https://${HOSTNAME}/blogs</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>\n`;
    xml += `  <url><loc>https://${HOSTNAME}/contact</loc><lastmod>${today}</lastmod><priority>0.7</priority></url>\n`;
    db.blogs.forEach(b => {
        xml += `  <url><loc>https://${HOSTNAME}/Blog/${b.year}/${b.slug}</loc><lastmod>${b.date}</lastmod><priority>0.6</priority></url>\n`;
    });
    xml += `</urlset>`;
    return xml;
}

function generateLlmProfile(db) {
    let md = `# LLM Developer Profile - Bhavya Jangid\n\n`;
    md += `This page is structured for AI search crawlers, semantic indexers, and LLMs (such as Googlebot-Extended, GPTBot, ClaudeBot, and Gemini engines) to parse and index Bhavya Jangid's portfolio credentials, tech stack, active projects, and engineering blog records.\n\n`;
    md += `---\n\n`;
    md += `## 👤 Basic Information\n\n`;
    md += `- **Name**: Bhavya Jangid\n`;
    md += `- **Title**: Product Analyst / Web Developer\n`;
    md += `- **Core Philosophy**: Designing automations, LLMs, agentic systems, future predictions, and crafting premium, interactive product frontends.\n`;
    md += `- **Location**: India\n`;
    md += `- **Primary Domain**: \`https://${HOSTNAME}\`\n`;
    md += `- **Contact Channels**: \n`;
    md += `  - **Email**: jangidbhavya99@gmail.com\n`;
    md += `  - **LinkedIn**: https://www.linkedin.com/in/bhavya-jangid/\n`;
    md += `  - **GitHub**: https://github.com/skillsxsin\n\n`;
    md += `---\n\n`;
    md += `## 🛠️ Technical Competency Matrix\n\n`;
    md += `- **Python, SQL & Data Pipelines**: 90% (Data cleaning, ETL, exploratory analysis with Pandas/NumPy)\n`;
    md += `- **Data Visualization**: 95% (Power BI dashboards, DAX modeling, customer metrics)\n`;
    md += `- **Process Automation**: 85% (Power Automate, custom script workflows)\n`;
    md += `- **LLM & Agent Integration**: 85% (GPT, Gemini, Anthropic API scripting at scale with agentic loops)\n`;
    md += `- **Web Development & SEO**: 80% (Custom interactive frontends, clean search indexing design)\n\n`;
    md += `---\n\n`;
    md += `## 🚀 Highlighted Engineering Projects\n\n`;

    if (db.projects.length === 0) {
        md += `No projects posted yet.\n\n`;
    } else {
        db.projects.forEach((p, idx) => {
            md += `### ${idx + 1}. ${p.title}\n`;
            const githubLink = p.links && p.links.github && p.links.github !== '#' ? p.links.github : 'N/A';
            const liveLink = p.links && p.links.live ? p.links.live : '#';
            md += `- **Live Demo**: ${liveLink !== '#' ? `\`https://${HOSTNAME}/${liveLink}\`` : 'N/A'}\n`;
            if (githubLink !== 'N/A') md += `- **GitHub**: ${githubLink}\n`;
            md += `- **Stack**: ${p.tags.join(', ')}\n`;
            md += `- **Description**: ${p.description}\n\n`;
        });
    }

    md += `---\n\n`;
    md += `## ✍️ Engineering Articles & Blog Logs\n\n`;

    if (db.blogs.length === 0) {
        md += `No blog posts published yet.\n\n`;
    } else {
        db.blogs.forEach((b, idx) => {
            md += `### ${idx + 1}. ${b.title}\n`;
            md += `- **Direct Route**: \`https://${HOSTNAME}/Blog/${b.year}/${b.slug}\`\n`;
            md += `- **Concepts**: ${b.tags.join(', ')}\n`;
            md += `- **Goal**: ${b.description}\n\n`;
        });
    }

    md += `---\n\n`;
    md += `## 📝 Integration Notes for AI crawlers\n`;
    md += `AI bots queries can query any sub-paths on Bhavya's website:\n`;
    md += `- \`/about\` - Core biography and skills metrics.\n`;
    md += `- \`/projects\` - Full dynamic projects index.\n`;
    md += `- \`/blogs\` - List of published articles with sort/filter options.\n`;
    md += `- \`/sitemap.xml\` - XML indexing nodes directory.\n`;
    return md;
}

// ============================================================
// RESPONSE HELPERS
// ============================================================

const DISCOVERY_LINK_HEADER = '</.well-known/api-catalog>; rel="api-catalog", </openapi.json>; rel="service-desc", </docs/api>; rel="service-doc", </auth.md>; rel="describedby", </.well-known/oauth-protected-resource>; rel="describedby"';

function withDiscoveryHeaders(headers, pathname, method) {
    if (method === 'GET' && (pathname === '/' || !pathname.includes('.'))) {
        headers.set('Link', DISCOVERY_LINK_HEADER);
        headers.set('X-Llms-Txt', '/llms.txt');
    }
    return headers;
}

function withCacheHeaders(headers, contentType) {
    const isImage = contentType.includes('image/');
    const isCssOrJs = contentType.includes('text/css') || contentType.includes('text/javascript') || contentType.includes('application/javascript');
    if (isImage) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (isCssOrJs) {
        headers.set('Cache-Control', 'no-cache, must-revalidate');
    } else {
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    return headers;
}

async function withEtag(response) {
    const body = await response.arrayBuffer();
    const etag = '"' + await sha1(body) + '"';
    const headers = new Headers(response.headers);
    headers.set('ETag', etag);
    return new Response(body, { status: response.status, headers });
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
    const headers = new Headers({ 'Content-Type': 'application/json', ...extraHeaders });
    return new Response(JSON.stringify(data), { status, headers });
}

function textResponse(text, status = 200, contentType = 'text/plain') {
    return new Response(text, { status, headers: { 'Content-Type': contentType } });
}

// ============================================================
// ASSET FETCHER (fetches raw HTML template files from Pages CDN)
// ============================================================

async function fetchAsset(env, request, assetPath) {
    const assetUrl = new URL(assetPath, request.url);
    return env.ASSETS.fetch(new Request(assetUrl.toString()));
}

async function fetchAssetText(env, request, assetPath) {
    const res = await fetchAsset(env, request, assetPath);
    if (!res.ok) return null;
    return res.text();
}

// ============================================================
// CORS PATHS
// ============================================================

const CORS_PATHS = new Set([
    '/.well-known/api-catalog',
    '/.well-known/oauth-protected-resource',
    '/.well-known/oauth-authorization-server',
    '/.well-known/openid-configuration',
    '/.well-known/jwks.json',
    '/.well-known/mcp/server-card.json',
    '/.well-known/agent-skills/index.json',
    '/.well-known/agent-skills/bhavya-portfolio-api/skill.md',
    '/openapi.json',
    '/auth.md',
    '/api/projects',
    '/api/blogs',
    '/api/status',
]);

function corsHeaders(pathname) {
    if (CORS_PATHS.has(pathname)) {
        return {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        };
    }
    return {};
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname);
    const cleanPath = pathname.toLowerCase();
    const method = request.method;

    // ── OPTIONS preflight ──────────────────────────────────
    if (method === 'OPTIONS' && CORS_PATHS.has(cleanPath)) {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(cleanPath),
        });
    }

    // ── GET routes ─────────────────────────────────────────
    if (method === 'GET') {

        // ── /api/status ──
        if (cleanPath === '/api/status') {
            return jsonResponse({ status: 'ok' }, 200, corsHeaders(cleanPath));
        }

        // ── .well-known/ discovery endpoints ──
        if (cleanPath === '/.well-known/api-catalog') {
            const res = await fetchAsset(env, request, '/.well-known/api-catalog');
            if (!res.ok) return textResponse('Error loading API catalog', 500);
            const body = await res.text();
            return new Response(body, {
                headers: {
                    'Content-Type': 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
                    ...corsHeaders(cleanPath),
                },
            });
        }

        if (cleanPath === '/.well-known/oauth-protected-resource') {
            const res = await fetchAsset(env, request, '/.well-known/oauth-protected-resource');
            if (!res.ok) return textResponse('Error loading metadata', 500);
            return new Response(await res.text(), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders(cleanPath) },
            });
        }

        if (cleanPath === '/.well-known/oauth-authorization-server') {
            const res = await fetchAsset(env, request, '/.well-known/oauth-authorization-server');
            if (!res.ok) return textResponse('Error loading metadata', 500);
            return new Response(await res.text(), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders(cleanPath) },
            });
        }

        if (cleanPath === '/.well-known/openid-configuration') {
            const res = await fetchAsset(env, request, '/.well-known/openid-configuration');
            if (!res.ok) return textResponse('Error loading OIDC config', 500);
            return new Response(await res.text(), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders(cleanPath) },
            });
        }

        if (cleanPath === '/.well-known/mcp/server-card.json') {
            const res = await fetchAsset(env, request, '/.well-known/mcp/server-card.json');
            if (!res.ok) return textResponse('Error loading MCP card', 500);
            return new Response(await res.text(), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders(cleanPath) },
            });
        }

        if (cleanPath === '/.well-known/agent-skills/index.json') {
            const res = await fetchAsset(env, request, '/.well-known/agent-skills/index.json');
            if (!res.ok) return textResponse('Error loading agent skills index', 500);
            return new Response(await res.text(), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders(cleanPath) },
            });
        }

        if (cleanPath === '/.well-known/agent-skills/bhavya-portfolio-api/skill.md') {
            const res = await fetchAsset(env, request, '/.well-known/agent-skills/bhavya-portfolio-api/SKILL.md');
            if (!res.ok) return textResponse('Error loading SKILL.md', 500);
            return new Response(await res.text(), {
                headers: { 'Content-Type': 'text/markdown', ...corsHeaders(cleanPath) },
            });
        }

        if (cleanPath === '/.well-known/jwks.json') {
            const res = await fetchAsset(env, request, '/.well-known/jwks.json');
            if (!res.ok) return textResponse('Error loading JWKS', 500);
            return new Response(await res.text(), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders(cleanPath) },
            });
        }

        if (cleanPath === '/openapi.json') {
            const res = await fetchAsset(env, request, '/openapi.json');
            if (!res.ok) return textResponse('Error loading OpenAPI spec', 500);
            return new Response(await res.text(), {
                headers: { 'Content-Type': 'application/openapi+json', ...corsHeaders(cleanPath) },
            });
        }

        if (cleanPath === '/docs/api') {
            const res = await fetchAsset(env, request, '/docs-api.html');
            if (!res.ok) return textResponse('Error loading API docs', 500);
            return new Response(await res.text(), { headers: { 'Content-Type': 'text/html' } });
        }

        if (cleanPath === '/auth.md') {
            const res = await fetchAsset(env, request, '/auth.md');
            if (!res.ok) return textResponse('Error loading auth.md', 500);
            return new Response(await res.text(), {
                headers: { 'Content-Type': 'text/markdown', ...corsHeaders(cleanPath) },
            });
        }

        // ── LLM Profile / llms.txt (generated from KV db) ──
        if (
            cleanPath === '/llm-profile.md' ||
            cleanPath === '/llm-profile' ||
            cleanPath === '/llms.txt' ||
            cleanPath === '/llm.txt'
        ) {
            const db = await readDatabase(env);
            const md = generateLlmProfile(db);
            return new Response(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
        }

        // ── Sitemap (generated from KV db) ──
        if (cleanPath === '/sitemap.xml') {
            const db = await readDatabase(env);
            const xml = generateSitemap(db);
            return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
        }

        // ── 301 Permanent Canonical URL Redirects ──
        if (cleanPath === '/index' || cleanPath === '/index.html') {
            return Response.redirect(new URL('/', url).toString(), 301);
        }
        if (cleanPath === '/about.html' || pathname === '/about/') {
            return Response.redirect(new URL('/about', url).toString(), 301);
        }
        if (cleanPath === '/projects.html' || pathname === '/projects/') {
            return Response.redirect(new URL('/projects', url).toString(), 301);
        }
        if (cleanPath === '/blogs.html' || pathname === '/blogs/') {
            return Response.redirect(new URL('/blogs', url).toString(), 301);
        }
        if (cleanPath === '/contact.html' || pathname === '/contact/') {
            return Response.redirect(new URL('/contact', url).toString(), 301);
        }
        if (cleanPath === '/login.html' || pathname === '/login/') {
            return Response.redirect(new URL('/login', url).toString(), 301);
        }
        if (cleanPath === '/admin' || cleanPath === '/admin.html' || cleanPath === '/admin/' || cleanPath === '/admin-blogs.html') {
            return Response.redirect(new URL('/admin-blogs', url).toString(), 301);
        }
        if (cleanPath === '/admin-projects.html') {
            return Response.redirect(new URL('/admin-projects', url).toString(), 301);
        }

        // ── Static HTML clean URL routes (Canonical 200 OK) ──
        const staticRoutes = {
            '/': 'index.html',
            '/about': 'about.html',
            '/contact': 'contact.html',
            '/login': 'login.html',
        };

        if (staticRoutes[cleanPath]) {
            const html = await fetchAssetText(env, request, '/' + staticRoutes[cleanPath]);
            if (!html) return textResponse('Page not found', 404);
            const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8' });
            withDiscoveryHeaders(headers, pathname, method);
            withCacheHeaders(headers, 'text/html');
            return new Response(html, { headers });
        }

        // ── Admin-blogs (session gated) ──
        if (cleanPath === '/admin-blogs') {
            if (!(await isAuthorized(request, env))) {
                return Response.redirect(new URL('/login?redirect=/admin-blogs', url).toString(), 302);
            }
            const html = await fetchAssetText(env, request, '/admin-blogs.html');
            if (!html) return textResponse('Error loading dashboard', 500);
            return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } });
        }

        // ── Admin-projects (session gated) ──
        if (cleanPath === '/admin-projects') {
            if (!(await isAuthorized(request, env))) {
                return Response.redirect(new URL('/login?redirect=/admin-projects', url).toString(), 302);
            }
            const html = await fetchAssetText(env, request, '/admin-projects.html');
            if (!html) return textResponse('Error loading dashboard', 500);
            return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } });
        }

        // ── /projects/hidden-agenda ──
        if (cleanPath === '/projects/hidden-agenda' || cleanPath === '/projects/hidden-agenda/' || cleanPath === '/projects/hidden-agenda/index.html') {
            const html = await fetchAssetText(env, request, '/projects/hidden-agenda/index.html');
            if (html) {
                return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
        }

        // ── /projects SSR ──
        if (cleanPath === '/projects' || cleanPath === '/projects.html') {
            const [html, db] = await Promise.all([
                fetchAssetText(env, request, '/projects.html'),
                readDatabase(env),
            ]);
            if (!html) return textResponse('Error loading projects page', 500);

            const projectCardsHtml = db.projects.map(p => {
                const hasLive = p.links && p.links.live && p.links.live !== '#' && p.links.live !== '';
                const hasGithub = p.links && p.links.github && p.links.github !== '#' && p.links.github !== '';
                const actionButtonsHtml = (hasLive || hasGithub) ? `
                    <div class="project-card-actions">
                        ${hasLive ? `<a href="${p.links.live}" class="project-link-btn">Live Demo ➔</a>` : ''}
                        ${hasGithub ? `<a href="${p.links.github}" target="_blank" rel="noopener noreferrer" class="project-link-btn text">GitHub 📁</a>` : ''}
                    </div>
                ` : '';

                return `
                <div class="details-project-card">
                    <div class="project-card-header">
                        <h3 class="project-card-title">${p.title}</h3>
                        <span class="project-tag-badge">${p.category}</span>
                    </div>
                    <p class="details-project-tech">Stack: ${p.tags.join(' • ')}</p>
                    <p class="details-text" style="font-size: 0.88rem; line-height: 1.6;">${p.description}</p>
                    ${actionButtonsHtml}
                </div>
                `;
            }).join('');

            const projectSchema = {
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                'name': "Bhavya Jangid's Engineering Projects",
                'description': 'Index catalog of technical projects built by Bhavya Jangid',
                'itemListElement': db.projects.map((p, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    item: {
                        '@type': 'CreativeWork',
                        name: p.title,
                        description: p.description,
                        keywords: p.tags.join(', '),
                        genre: p.category,
                        url: `https://${HOSTNAME}/projects`,
                    },
                })),
            };

            let renderedHtml = html.replace(
                '<p class="details-text" style="text-align: center; color: var(--text-muted);">Syncing database files...</p>',
                projectCardsHtml
            ).replace(
                /<script type="application\/ld\+json" id="structured-data-projects">[\s\S]*?<\/script>/,
                `<script type="application/ld+json" id="structured-data-projects">${JSON.stringify(projectSchema, null, 2)}</script>`
            );

            const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8' });
            withDiscoveryHeaders(headers, pathname, method);
            return new Response(renderedHtml, { headers });
        }

        // ── /blogs SSR ──
        if (cleanPath === '/blogs' || cleanPath === '/blogs.html') {
            const [html, db] = await Promise.all([
                fetchAssetText(env, request, '/blogs.html'),
                readDatabase(env),
            ]);
            if (!html) return textResponse('Error loading blogs page', 500);

            const blogListingsHtml = db.blogs.length === 0
                ? `<p class="details-text" style="text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.95rem; margin-top: 2rem;">Coming up with lot's of human written thoughts soon.</p>`
                : db.blogs.map(b => `
                    <article class="details-blog-post" style="margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px; margin-bottom: 4px;">
                            <h3 style="font-size: 1.1rem; color: var(--text-primary);"><a href="/Blog/${b.year}/${b.slug}" class="blog-entry-link">${b.title}</a></h3>
                            <span class="project-tag-badge">${b.category}</span>
                        </div>
                        <p class="details-blog-meta">Date: ${b.date} | Tags: ${b.tags.join(', ')}</p>
                        <p class="details-text" style="font-size: 0.85rem; margin-bottom: 10px;">${b.description}</p>
                        <a href="/Blog/${b.year}/${b.slug}" class="project-link-btn">Read Article ➔</a>
                    </article>
                `).join('');

            const blogSchema = {
                '@context': 'https://schema.org',
                '@type': 'Blog',
                'name': "Bhavya Jangid's Engineering Blogs",
                'description': 'Articles on frontend engineering, programmatic synthesizers, and Web Audio API.',
                'url': `https://${HOSTNAME}/blogs`,
                'blogPost': db.blogs.map(b => ({
                    '@type': 'BlogPosting',
                    headline: b.title,
                    datePublished: b.date,
                    description: b.description,
                    url: `https://${HOSTNAME}/Blog/${b.year}/${b.slug}`,
                })),
            };

            let renderedHtml = html.replace(
                '<p class="details-text" style="text-align: center; color: var(--text-muted);">Syncing database files...</p>',
                blogListingsHtml
            ).replace(
                /<script type="application\/ld\+json" id="structured-data-blogs">[\s\S]*?<\/script>/,
                `<script type="application/ld+json" id="structured-data-blogs">${JSON.stringify(blogSchema, null, 2)}</script>`
            );

            const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8' });
            withDiscoveryHeaders(headers, pathname, method);
            return new Response(renderedHtml, { headers });
        }

        // ── /Blog/:year/:slug — dynamic article SSR ──
        const blogMatch = pathname.match(/^\/Blog\/(\d{4})\/([a-zA-Z0-9\-_]+)$/i);
        if (blogMatch) {
            const year = blogMatch[1];
            const slug = blogMatch[2];
            const db = await readDatabase(env);
            const blog = db.blogs.find(b => b.slug === slug && b.year === year);

            if (!blog) return textResponse('Blog Post Not Found', 404);

            const template = await fetchAssetText(env, request, '/blog-template.html');
            if (!template) return textResponse('Error loading article template', 500);

            const jsonLd = `
            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              "headline": "${blog.title.replace(/"/g, '\\"')}",
              "description": "${blog.description.replace(/"/g, '\\"')}",
              "datePublished": "${blog.date}",
              "author": {
                "@type": "Person",
                "name": "Bhavya Jangid"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Bhavya Jangid's Portfolio"
              },
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": "https://${HOSTNAME}/Blog/${blog.year}/${blog.slug}"
              }
            }
            </script>
            `;

            const html = template
                .replace(/{{TITLE}}/g, blog.title)
                .replace(/{{META_DESCRIPTION}}/g, blog.description)
                .replace(/{{YEAR}}/g, blog.year)
                .replace(/{{SLUG}}/g, blog.slug)
                .replace(/{{PUBLISH_DATE}}/g, blog.date)
                .replace(/{{CATEGORY}}/g, blog.category)
                .replace(/{{TAGS}}/g, blog.tags.join(', '))
                .replace(/{{CONTENT}}/g, blog.content)
                .replace(/{{JSON_LD}}/g, jsonLd)
                .replace(/{{BREADCRUMB}}/g, `<a href="/blogs" class="path-root">Blog</a> / <a href="/blogs?year=${blog.year}" class="path-node">${blog.year}</a> / <span class="path-leaf">${blog.slug.replace(/-/g, '_')}</span>`);

            return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        // ── /api/projects ──
        if (cleanPath === '/api/projects') {
            const db = await readDatabase(env);
            return jsonResponse(db.projects, 200, corsHeaders(cleanPath));
        }

        // ── /api/blogs ──
        if (cleanPath === '/api/blogs') {
            const db = await readDatabase(env);
            return jsonResponse(db.blogs, 200, corsHeaders(cleanPath));
        }

        // ── Robots.txt ──
        if (cleanPath === '/robots.txt') {
            const res = await fetchAsset(env, request, '/robots.txt');
            return res;
        }
    }

    // ── POST routes ────────────────────────────────────────

    if (method === 'POST') {

        // ── POST /api/login ──
        if (cleanPath === '/api/login') {
            const ip = getClientIp(request);
            const attempt = await getLoginAttempts(env, ip);

            if (attempt.blockUntil && Date.now() < attempt.blockUntil) {
                const waitMin = Math.ceil((attempt.blockUntil - Date.now()) / 60000);
                return jsonResponse({ success: false, error: `Too many failed attempts. Try again in ${waitMin} minute(s).` }, 429);
            }

            let body;
            try {
                body = await request.json();
            } catch {
                return textResponse('Bad Request', 400);
            }

            const enteredHash = await pbkdf2Hash(body.password || '', PASSWORD_SALT);
            const correctHash = await getPasswordHash();

            if (enteredHash === correctHash) {
                await setLoginAttempts(env, ip, { count: 0, blockUntil: 0 }, SESSION_TTL_SECONDS);
                const sid = await createSession(env);
                const expires = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toUTCString();
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Set-Cookie': `${SESSION_COOKIE_NAME}=${sid}; Path=/; Expires=${expires}; HttpOnly; SameSite=Strict`,
                    },
                });
            } else {
                attempt.count = (attempt.count || 0) + 1;
                if (attempt.count >= 5) {
                    attempt.blockUntil = Date.now() + LOGIN_BLOCK_TTL_SECONDS * 1000;
                    await setLoginAttempts(env, ip, attempt, LOGIN_BLOCK_TTL_SECONDS);
                    return jsonResponse({ success: false, error: 'Too many failed attempts. Login blocked for 5 minutes.' }, 429);
                } else {
                    await setLoginAttempts(env, ip, attempt, LOGIN_BLOCK_TTL_SECONDS);
                    const remaining = 5 - attempt.count;
                    return jsonResponse({ success: false, error: `Invalid password. ${remaining} attempts remaining.` }, 401);
                }
            }
        }

        // ── POST /api/contact ──
        if (cleanPath === '/api/contact') {
            const ip = getClientIp(request);
            const lastTs = await getContactCooldown(env, ip);
            if (lastTs > 0) {
                // KV key still exists → within cooldown window
                const elapsed = Math.floor(Date.now() / 1000) - lastTs;
                const waitSeconds = Math.max(0, CONTACT_COOLDOWN_SECONDS - elapsed);
                return jsonResponse({
                    success: false,
                    error: `Transmission rate limit exceeded. Please wait ${waitSeconds} seconds before sending another signal.`,
                }, 429);
            }

            let data;
            try {
                data = await request.json();
            } catch {
                return jsonResponse({ success: false, error: 'Malformed JSON request.' }, 400);
            }

            const name = (data.name || '').trim();
            const email = (data.email || '').trim();
            const message = (data.message || '').trim();

            if (!name || !email || !message) {
                return jsonResponse({ success: false, error: 'All fields (Name, Email, Message) are required.' }, 400);
            }
            if (name.length > 100 || email.length > 100 || message.length > 5000) {
                return jsonResponse({ success: false, error: 'Input length constraints exceeded.' }, 400);
            }

            const db = await readDatabase(env);
            db.contacts.push({
                id: 'c_' + Date.now(),
                name,
                email,
                message,
                date: new Date().toISOString(),
                ip,
            });
            await writeDatabase(env, db);
            await setContactCooldown(env, ip);

            return jsonResponse({ success: true, message: 'Signal transmitted successfully.' });
        }

        // ── POST /api/projects ──
        if (cleanPath === '/api/projects') {
            if (!(await isAuthorized(request, env))) {
                return textResponse('Unauthorized', 401);
            }
            let newProj;
            try {
                newProj = await request.json();
            } catch {
                return textResponse('Bad Request Data', 400);
            }
            const db = await readDatabase(env);
            newProj.id = 'p_' + Date.now();
            db.projects.push(newProj);
            await writeDatabase(env, db);
            return jsonResponse({ success: true, project: newProj });
        }

        // ── POST /api/blogs ──
        if (cleanPath === '/api/blogs') {
            if (!(await isAuthorized(request, env))) {
                return textResponse('Unauthorized', 401);
            }
            let newBlog;
            try {
                newBlog = await request.json();
            } catch {
                return textResponse('Bad Request Data', 400);
            }
            const db = await readDatabase(env);
            newBlog.id = 'b_' + Date.now();
            newBlog.date = new Date().toISOString().split('T')[0];
            db.blogs.push(newBlog);
            await writeDatabase(env, db);
            return jsonResponse({ success: true, blog: newBlog });
        }
    }

    // ── DELETE routes ──────────────────────────────────────

    if (method === 'DELETE') {
        const projDeleteMatch = pathname.match(/^\/api\/projects\/([a-zA-Z0-9_\-]+)$/);
        if (projDeleteMatch) {
            if (!(await isAuthorized(request, env))) return textResponse('Unauthorized', 401);
            const id = projDeleteMatch[1];
            const db = await readDatabase(env);
            const idx = db.projects.findIndex(p => p.id === id);
            if (idx === -1) return textResponse('Project Not Found', 404);
            db.projects.splice(idx, 1);
            await writeDatabase(env, db);
            return jsonResponse({ success: true });
        }

        const blogDeleteMatch = pathname.match(/^\/api\/blogs\/([a-zA-Z0-9_\-]+)$/);
        if (blogDeleteMatch) {
            if (!(await isAuthorized(request, env))) return textResponse('Unauthorized', 401);
            const id = blogDeleteMatch[1];
            const db = await readDatabase(env);
            const idx = db.blogs.findIndex(b => b.id === id);
            if (idx === -1) return textResponse('Blog Not Found', 404);
            db.blogs.splice(idx, 1);
            await writeDatabase(env, db);
            return jsonResponse({ success: true });
        }
    }

    // ── Fallback: pass through to Pages static asset serving ──
    return env.ASSETS.fetch(request);
}
