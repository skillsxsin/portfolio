const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { fork } = require('child_process');

const PASSWORD_SALT = process.env.PASSWORD_SALT || 'bhavya_salt_2026';
// Irreversible salted PBKDF2-SHA512 cryptographic hash
const DEFAULT_SALTED_PASSWORD_HASH = '2cb5c6565ccad2153b0163b638ce00def25f6d11a5ea020dee92f9d7838ea48c8efe45e5752dd818be37c22734994b7200e68ee85bc8c5eb996c196a25554fbe';

function getExpectedPasswordHash() {
    if (process.env.ADMIN_PASSWORD_HASH) return process.env.ADMIN_PASSWORD_HASH;
    if (process.env.ADMIN_PASSWORD) return crypto.pbkdf2Sync(process.env.ADMIN_PASSWORD, PASSWORD_SALT, 1000, 64, 'sha512').toString('hex');
    return DEFAULT_SALTED_PASSWORD_HASH;
}

function constantTimeEquals(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

const SESSION_COOKIE_NAME = 'session_id';
const activeSessions = new Map();
const loginAttempts = new Map();

const PORT = process.env.PORT || 3000;
const GAME_PORT = process.env.GAME_PORT || 3003;
const HOSTNAME = process.env.DOMAIN || 'bhavyajangid.com';
const PUBLIC_DIR = __dirname;
const DB_FILE = path.join(PUBLIC_DIR, 'db.json');

let gameProcess = null;

function startGameProcess() {
    const gameServerPath = path.join(PUBLIC_DIR, 'Mafia style game', 'server.js');
    if (fs.existsSync(gameServerPath)) {
        console.log(`[MAIN SERVER] Launching Hidden Agenda game server process on port ${GAME_PORT}...`);
        try {
            gameProcess = fork(gameServerPath, [], {
                cwd: path.join(PUBLIC_DIR, 'Mafia style game'),
                env: {
                    ...process.env,
                    PORT: String(GAME_PORT),
                    NEXT_PUBLIC_BASE_PATH: '/projects/hidden-agenda'
                }
            });
            gameProcess.on('error', (err) => console.error('[GAME PROCESS ERROR]', err));
        } catch (e) {
            console.error('[GAME PROCESS FORK FAILED]', e);
        }
    }
}

function proxyToGameServer(req, res) {
    const proxyReq = http.request({
        hostname: '127.0.0.1',
        port: GAME_PORT,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `localhost:${GAME_PORT}` }
    }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Hidden Agenda Game Server is starting up... Please refresh in a moment.');
    });

    req.pipe(proxyReq, { end: true });
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json'
};

// Helper to read JSON database
function readDatabase() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return { blogs: [], projects: [], contacts: [] };
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(data);
        if (!parsed.blogs) parsed.blogs = [];
        if (!parsed.projects) parsed.projects = [];
        if (!parsed.contacts) parsed.contacts = [];
        return parsed;
    } catch (e) {
        console.error("DB Read Error:", e);
        return { blogs: [], projects: [], contacts: [] };
    }
}

// Sync LLM Profile and Sitemap files on disk dynamically
function syncLlmProfileAndSitemap() {
    try {
        const db = readDatabase();
        const today = new Date().toISOString().split('T')[0];

        // 1. Generate sitemap.xml
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

        fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf8');
        console.log("Dynamically updated physical sitemap.xml");

        // 2. Generate llm-profile.md (which will also be identical to llms.txt)
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
                if (githubLink !== 'N/A') {
                    md += `- **GitHub**: ${githubLink}\n`;
                }
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

        fs.writeFileSync(path.join(PUBLIC_DIR, 'llm-profile.md'), md, 'utf8');
        fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), md, 'utf8');
        console.log("Dynamically updated physical llm-profile.md and llms.txt");
    } catch (e) {
        console.error("Sync Error:", e);
    }
}

let syncTimeout = null;
function syncLlmProfileAndSitemapDebounced() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        syncLlmProfileAndSitemap();
        syncTimeout = null;
    }, 100);
}

// Helper to write JSON database
function writeDatabase(db) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        console.error("DB Write Error:", e);
    }
}

// Watch db.json for manual or external updates to trigger LLM profile sync
try {
    let watchDebounce = null;
    fs.watch(DB_FILE, (eventType) => {
        if (eventType === 'change') {
            if (watchDebounce) clearTimeout(watchDebounce);
            watchDebounce = setTimeout(() => {
                console.log("db.json changed externally. Syncing profile and sitemap...");
                syncLlmProfileAndSitemap();
                watchDebounce = null;
            }, 100);
        }
    });
} catch (e) {
    console.warn("Unable to set file watch on db.json:", e);
}

const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'session_id';

// PBKDF2 Password Hashing variables
const PASSWORD_SALT = 'bhavya_salt_2026';
const PASSWORD_HASH = crypto.pbkdf2Sync('pink AP26 aircrack', PASSWORD_SALT, 1000, 64, 'sha512').toString('hex');

// In-memory sessions store (maps secure session IDs to true)
const activeSessions = new Map();

// In-memory login attempts tracking (maps IP to { count, blockUntil })
const loginAttempts = new Map();

// In-memory contact submissions tracking (maps IP to lastSubmittedTimestamp)
const contactSubmissions = new Map();

// Helper to parse cookies from headers
function getCookie(req, name) {
    const list = {};
    const rc = req.headers.cookie;
    if (rc) {
        rc.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });
    }
    return list[name];
}

// Check if requester has a valid session token in active sessions
function isAuthorized(req) {
    const sid = getCookie(req, SESSION_COOKIE_NAME);
    return sid && activeSessions.has(sid);
}

// Get real client IP, respecting standard Cloudflare and proxy headers
function getClientIp(req) {
    return req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
}

function htmlToMarkdown(html) {
    if (!html) return '';
    let md = html;
    // Remove scripts and styles
    md = md.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    md = md.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    // Replace headers
    md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n');
    md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n');
    // Replace paragraphs
    md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
    // Replace links
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
    // Replace bold/italic
    md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');
    // Replace list items
    md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '\n$1\n');
    md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '\n$1\n');
    // Replace blockquotes
    md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n');
    // Remove other HTML tags
    md = md.replace(/<[^>]+>/g, '');
    // Decode entities
    md = md.replace(/&nbsp;/g, ' ')
           .replace(/&lt;/g, '<')
           .replace(/&gt;/g, '>')
           .replace(/&amp;/g, '&')
           .replace(/&quot;/g, '"')
           .replace(/&#39;/g, "'");
    // Clean up whitespace
    md = md.split('\n')
           .map(line => line.trim())
           .filter((line, index, arr) => {
               return line !== '' || (index > 0 && arr[index - 1] !== '');
           })
           .join('\n')
           .trim();
    return md;
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    const method = req.method;

    // Proxy Hidden Agenda Game requests to Next.js server on port 3003
    if (pathname.startsWith('/projects/hidden-agenda') || pathname.startsWith('/_next') || pathname.includes('/socket.io')) {
        proxyToGameServer(req, res);
        return;
    }

    // Set CORS headers for all public discovery/metadata endpoints and public API endpoints
    const corsPaths = [
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
        '/api/status'
    ];

    if (corsPaths.includes(pathname.toLowerCase())) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
        
        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
    }

    // Hook res.writeHead and res.end to support Markdown negotiation
    const originalWriteHead = res.writeHead;
    const originalEnd = res.end;
    let responseHeaders = {};
    let responseStatusCode = 200;
    let responseBuffer = [];

    res.writeHead = function(statusCode, reasonOrHeaders, objHeaders) {
        responseStatusCode = statusCode;
        const headers = objHeaders || (typeof reasonOrHeaders === 'object' ? reasonOrHeaders : null);
        if (headers) {
            responseHeaders = { ...responseHeaders, ...headers };
        }
        return this;
    };

    res.write = function(chunk) {
        if (chunk) {
            responseBuffer.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return true;
    };

    res.end = function(chunk) {
        if (chunk) {
            responseBuffer.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const fullContent = Buffer.concat(responseBuffer);
        const acceptHeader = req.headers.accept || '';
        
        let contentType = responseHeaders['Content-Type'] || responseHeaders['content-type'] || '';
        if (!contentType && typeof res.getHeader === 'function') {
            contentType = res.getHeader('Content-Type') || res.getHeader('content-type') || '';
        }

        // Set Cache-Control Headers for Cloudflare Optimization
        if (contentType) {
            const isStaticImage = contentType.includes('image/') || 
                                  contentType.includes('image/x-icon');
            const isCssOrJs = contentType.includes('text/css') || 
                              contentType.includes('text/javascript') || 
                              contentType.includes('application/javascript');

            if (isStaticImage) {
                responseHeaders['Cache-Control'] = 'public, max-age=31536000, immutable';
                if (typeof res.setHeader === 'function') {
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                }
            } else if (isCssOrJs) {
                responseHeaders['Cache-Control'] = 'no-cache, must-revalidate';
                if (typeof res.setHeader === 'function') {
                    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
                }
            } else {
                responseHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                if (typeof res.setHeader === 'function') {
                    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                }
            }
        }

        // Merge Link response headers for agent discovery (RFC 8288)
        if (method === 'GET' && (pathname === '/' || pathname.endsWith('.html') || !pathname.includes('.'))) {
            responseHeaders['Link'] = '</.well-known/api-catalog>; rel="api-catalog", </openapi.json>; rel="service-desc", </docs/api>; rel="service-doc", </auth.md>; rel="describedby", </.well-known/oauth-protected-resource>; rel="describedby"';
            responseHeaders['X-Llms-Txt'] = '/llms.txt';
            if (typeof res.setHeader === 'function') {
                res.setHeader('Link', responseHeaders['Link']);
                res.setHeader('X-Llms-Txt', '/llms.txt');
            }
        }

        let finalContent = fullContent;
        if (contentType && contentType.includes('text/html') && acceptHeader.includes('text/markdown')) {
            const htmlString = fullContent.toString('utf8');
            const md = htmlToMarkdown(htmlString);
            const tokens = Math.ceil(md.split(/\s+/).filter(Boolean).length * 1.3);
            
            if (typeof res.setHeader === 'function') {
                res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
                res.setHeader('X-Markdown-Tokens', tokens.toString());
                res.removeHeader('Content-Length');
                res.removeHeader('content-length');
            }
            responseHeaders['Content-Type'] = 'text/markdown; charset=utf-8';
            responseHeaders['X-Markdown-Tokens'] = tokens.toString();
            delete responseHeaders['Content-Length'];
            delete responseHeaders['content-length'];
            
            finalContent = Buffer.from(md, 'utf8');
        }

        // Compute ETag and handle conditional GET (304 Not Modified)
        if (responseStatusCode === 200 && finalContent.length > 0) {
            const etag = '"' + crypto.createHash('sha1').update(finalContent).digest('base64') + '"';
            responseHeaders['ETag'] = etag;
            if (typeof res.setHeader === 'function') {
                res.setHeader('ETag', etag);
            }

            if ((method === 'GET' || method === 'HEAD') && req.headers['if-none-match'] === etag) {
                if (typeof res.setHeader === 'function') {
                    res.removeHeader('Content-Length');
                    res.removeHeader('content-length');
                }
                delete responseHeaders['Content-Length'];
                delete responseHeaders['content-length'];

                originalWriteHead.call(res, 304, responseHeaders);
                originalEnd.call(res);
                return;
            }
        }

        originalWriteHead.call(res, responseStatusCode, responseHeaders);
        originalEnd.call(res, finalContent);
    };

    console.log(`[${method}] ${pathname}`);

    // Set LLM Auto-Discovery headers for all HTML requests
    if (method === 'GET' && (pathname === '/' || pathname.endsWith('.html') || !pathname.includes('.'))) {
        res.setHeader('Link', '</.well-known/api-catalog>; rel="api-catalog", </openapi.json>; rel="service-desc", </docs/api>; rel="service-doc", </auth.md>; rel="describedby", </.well-known/oauth-protected-resource>; rel="describedby"');
        res.setHeader('X-Llms-Txt', '/llms.txt');
    }

    // ==========================================================================
    // 0. CLEAN URLS ROUTING & SERVER-SIDE PRE-RENDERING (SSR)
    // ==========================================================================
    if (method === 'GET') {
        const cleanPath = pathname.toLowerCase();

        // --------------------------------------------------------------------------
        // AGENT DISCOVERY METADATA ROUTING
        // --------------------------------------------------------------------------
        if (cleanPath === '/.well-known/api-catalog') {
            fs.readFile(path.join(PUBLIC_DIR, '.well-known', 'api-catalog'), 'utf8', (err, content) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading API catalog');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"' });
                res.end(content);
            });
            return;
        }

        if (cleanPath === '/.well-known/oauth-protected-resource') {
            fs.readFile(path.join(PUBLIC_DIR, '.well-known', 'oauth-protected-resource'), 'utf8', (err, content) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading protected resource metadata');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(content);
            });
            return;
        }

        if (cleanPath === '/.well-known/oauth-authorization-server') {
            fs.readFile(path.join(PUBLIC_DIR, '.well-known', 'oauth-authorization-server'), 'utf8', (err, content) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading authorization server metadata');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(content);
            });
            return;
        }

        if (cleanPath === '/.well-known/openid-configuration') {
            fs.readFile(path.join(PUBLIC_DIR, '.well-known', 'openid-configuration'), 'utf8', (err, content) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading OIDC configuration');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(content);
            });
            return;
        }

        if (cleanPath === '/.well-known/mcp/server-card.json') {
            fs.readFile(path.join(PUBLIC_DIR, '.well-known', 'mcp', 'server-card.json'), 'utf8', (err, content) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading MCP server card');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(content);
            });
            return;
        }

        if (cleanPath === '/.well-known/agent-skills/index.json') {
            fs.readFile(path.join(PUBLIC_DIR, '.well-known', 'agent-skills', 'index.json'), 'utf8', (err, content) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading agent skills index');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(content);
            });
            return;
        }

        if (cleanPath === '/.well-known/agent-skills/bhavya-portfolio-api/skill.md') {
            fs.readFile(path.join(PUBLIC_DIR, '.well-known', 'agent-skills', 'bhavya-portfolio-api', 'SKILL.md'), 'utf8', (err, content) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading SKILL.md');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/markdown' });
                res.end(content);
            });
            return;
        }

        if (cleanPath === '/openapi.json') {
            fs.readFile(path.join(PUBLIC_DIR, 'openapi.json'), 'utf8', (err, content) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading OpenAPI spec');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/openapi+json' });
                res.end(content);
            });
            return;
        }

        if (cleanPath === '/docs/api') {
            fs.readFile(path.join(PUBLIC_DIR, 'docs-api.html'), 'utf8', (err, content) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading API documentation');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            });
            return;
        }

        if (cleanPath === '/auth.md') {
            fs.readFile(path.join(PUBLIC_DIR, 'auth.md'), 'utf8', (err, content) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading auth.md');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/markdown' });
                res.end(content);
            });
            return;
        }

        if (cleanPath === '/.well-known/jwks.json') {
            fs.readFile(path.join(PUBLIC_DIR, '.well-known', 'jwks.json'), 'utf8', (err, content) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading JWKS');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(content);
            });
            return;
        }

        if (cleanPath === '/api/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
            return;
        }
        
        // 301 Canonical Redirects
        if (cleanPath === '/index' || cleanPath === '/index.html') {
            res.writeHead(301, { 'Location': '/' });
            res.end();
            return;
        }
        if (cleanPath === '/about.html') {
            res.writeHead(301, { 'Location': '/about' });
            res.end();
            return;
        }
        if (cleanPath === '/contact.html') {
            res.writeHead(301, { 'Location': '/contact' });
            res.end();
            return;
        }
        if (cleanPath === '/projects.html') {
            res.writeHead(301, { 'Location': '/projects' });
            res.end();
            return;
        }
        if (cleanPath === '/blogs.html') {
            res.writeHead(301, { 'Location': '/blogs' });
            res.end();
            return;
        }
        if (cleanPath === '/login.html') {
            res.writeHead(301, { 'Location': '/login' });
            res.end();
            return;
        }
        if (cleanPath === '/admin' || cleanPath === '/admin.html' || cleanPath === '/admin-blogs.html') {
            res.writeHead(301, { 'Location': '/admin-blogs' });
            res.end();
            return;
        }
        if (cleanPath === '/admin-projects.html') {
            res.writeHead(301, { 'Location': '/admin-projects' });
            res.end();
            return;
        }

        // Handle root
        if (cleanPath === '/') {
            fs.readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8', (err, html) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading home page');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            });
            return;
        }

        // Handle about
        if (cleanPath === '/about') {
            fs.readFile(path.join(PUBLIC_DIR, 'about.html'), 'utf8', (err, html) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading about page');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            });
            return;
        }

        // Handle contact
        if (cleanPath === '/contact') {
            fs.readFile(path.join(PUBLIC_DIR, 'contact.html'), 'utf8', (err, html) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading contact page');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            });
            return;
        }

        // Handle login page
        if (cleanPath === '/login') {
            fs.readFile(path.join(PUBLIC_DIR, 'login.html'), 'utf8', (err, html) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading login page');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            });
            return;
        }

        // Handle admin-blogs page with session gate
        if (cleanPath === '/admin-blogs') {
            if (!isAuthorized(req)) {
                res.writeHead(302, { 'Location': '/login?redirect=/admin-blogs' });
                res.end();
                return;
            }
            fs.readFile(path.join(PUBLIC_DIR, 'admin-blogs.html'), 'utf8', (err, html) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading blogs dashboard');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html', 'X-Robots-Tag': 'noindex, nofollow' });
                res.end(html);
            });
            return;
        }

        // Handle admin-projects page with session gate
        if (cleanPath === '/admin-projects') {
            if (!isAuthorized(req)) {
                res.writeHead(302, { 'Location': '/login?redirect=/admin-projects' });
                res.end();
                return;
            }
            fs.readFile(path.join(PUBLIC_DIR, 'admin-projects.html'), 'utf8', (err, html) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading projects dashboard');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html', 'X-Robots-Tag': 'noindex, nofollow' });
                res.end(html);
            });
            return;
        }

        // Handle LLM profile context crawl route
        if (cleanPath === '/llm-profile.md' || cleanPath === '/llm-profile' || cleanPath === '/llms.txt' || cleanPath === '/llm.txt') {
            fs.readFile(path.join(PUBLIC_DIR, 'llm-profile.md'), 'utf8', (err, markdown) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading LLM profile');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/markdown' });
                res.end(markdown);
            });
            return;
        }

        // Handle projects with SSR pre-rendering
        if (cleanPath === '/projects' || cleanPath === '/projects.html') {
            fs.readFile(path.join(PUBLIC_DIR, 'projects.html'), 'utf8', (err, html) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading projects page');
                    return;
                }
                const db = readDatabase();

                // Generate static project card elements for crawlers
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

                // Replace the syncing placeholder text in projects.html
                let renderedHtml = html.replace(
                    '<p class="details-text" style="text-align: center; color: var(--text-muted);">Syncing database files...</p>',
                    projectCardsHtml
                );

                // Inject dynamic JSON-LD CreativeWork ItemList schema
                const projectSchema = {
                    "@context": "https://schema.org",
                    "@type": "ItemList",
                    "name": "Bhavya Jangid's Engineering Projects",
                    "description": "Index catalog of technical projects built by Bhavya Jangid",
                    "itemListElement": db.projects.map((p, index) => ({
                        "@type": "ListItem",
                        "position": index + 1,
                        "item": {
                            "@type": "CreativeWork",
                            "name": p.title,
                            "description": p.description,
                            "keywords": p.tags.join(', '),
                            "genre": p.category,
                            "url": `https://${HOSTNAME}/projects`
                        }
                    }))
                };

                renderedHtml = renderedHtml.replace(
                    /<script type="application\/ld\+json" id="structured-data-projects">[\s\S]*?<\/script>/,
                    `<script type="application/ld+json" id="structured-data-projects">${JSON.stringify(projectSchema, null, 2)}</script>`
                );

                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(renderedHtml);
            });
            return;
        }

        // Handle blogs index with SSR pre-rendering
        if (cleanPath === '/blogs' || cleanPath === '/blogs.html') {
            fs.readFile(path.join(PUBLIC_DIR, 'blogs.html'), 'utf8', (err, html) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading blogs page');
                    return;
                }
                const db = readDatabase();

                // Generate static blog elements for crawlers
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

                // Replace the syncing placeholder text in blogs.html
                let renderedHtml = html.replace(
                    '<p class="details-text" style="text-align: center; color: var(--text-muted);">Syncing database files...</p>',
                    blogListingsHtml
                );

                // Inject dynamic JSON-LD Blog schema listing all posts
                const blogSchema = {
                    "@context": "https://schema.org",
                    "@type": "Blog",
                    "name": "Bhavya Jangid's Engineering Blogs",
                    "description": "Articles on frontend engineering, programmatic synthesizers, and Web Audio API.",
                    "url": `https://${HOSTNAME}/blogs`,
                    "blogPost": db.blogs.map(b => ({
                        "@type": "BlogPosting",
                        "headline": b.title,
                        "datePublished": b.date,
                        "description": b.description,
                        "url": `https://${HOSTNAME}/Blog/${b.year}/${b.slug}`
                    }))
                };

                renderedHtml = renderedHtml.replace(
                    /<script type="application\/ld\+json" id="structured-data-blogs">[\s\S]*?<\/script>/,
                    `<script type="application/ld+json" id="structured-data-blogs">${JSON.stringify(blogSchema, null, 2)}</script>`
                );

                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(renderedHtml);
            });
            return;
        }
    }

    // ==========================================================================
    // 1. DYNAMIC SSR ARTICLE ROUTING (e.g. /Blog/2026/about-ai)
    // ==========================================================================
    const blogMatch = pathname.match(/^\/Blog\/(\d{4})\/([a-zA-Z0-9-_]+)$/i);
    if (blogMatch && method === 'GET') {
        const year = blogMatch[1];
        const slug = blogMatch[2];
        const db = readDatabase();
        const blog = db.blogs.find(b => b.slug === slug && b.year === year);

        if (!blog) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Blog Post Not Found');
            return;
        }

        // Read template
        const templatePath = path.join(PUBLIC_DIR, 'blog-template.html');
        fs.readFile(templatePath, 'utf8', (err, template) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading article template');
                return;
            }

            // Generate JSON-LD structured schema for crawler indexing
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

            // Replace templates markers
            let html = template
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

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        });
        return;
    }

    // ==========================================================================
    // 2. DYNAMIC CRAWLER SITEMAP (sitemap.xml)
    // ==========================================================================
    if (pathname === '/sitemap.xml' && method === 'GET') {
        const db = readDatabase();
        const today = new Date().toISOString().split('T')[0];
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        
        // Static pages
        xml += `  <url><loc>https://${HOSTNAME}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>\n`;
        xml += `  <url><loc>https://${HOSTNAME}/about</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>\n`;
        xml += `  <url><loc>https://${HOSTNAME}/projects</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>\n`;
        xml += `  <url><loc>https://${HOSTNAME}/blogs</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>\n`;
        xml += `  <url><loc>https://${HOSTNAME}/contact</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>\n`;
        xml += `  <url><loc>https://${HOSTNAME}/llm-profile.md</loc><lastmod>${today}</lastmod><priority>0.7</priority></url>\n`;
        
        // Blog articles pages dynamically
        db.blogs.forEach(b => {
            xml += `  <url><loc>https://${HOSTNAME}/Blog/${b.year}/${b.slug}</loc><lastmod>${b.date}</lastmod><priority>0.6</priority></url>\n`;
        });
        
        xml += `</urlset>`;

        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end(xml);
        return;
    }

    // ==========================================================================
    // 3. REST API ENDPOINTS
    // ==========================================================================
    // POST /api/login (Single-phase with IP-based lockout rate-limiting)
    if (pathname === '/api/login' && method === 'POST') {
        const ip = getClientIp(req);
        
        // Check if IP is blocked
        const attempt = loginAttempts.get(ip);
        if (attempt) {
            if (attempt.blockUntil && Date.now() < attempt.blockUntil) {
                const waitTimeMinutes = Math.ceil((attempt.blockUntil - Date.now()) / 60000);
                res.writeHead(429, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: `Too many failed attempts. Try again in ${waitTimeMinutes} minute(s).` }));
                return;
            } else if (attempt.blockUntil && Date.now() >= attempt.blockUntil) {
                // Block has expired, reset attempts
                loginAttempts.delete(ip);
            }
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                // Hash entered password using PBKDF2
                const enteredHash = crypto.pbkdf2Sync(data.password || '', PASSWORD_SALT, 1000, 64, 'sha512').toString('hex');
                
                if (constantTimeEquals(enteredHash, getExpectedPasswordHash())) {
                    // Success: Reset rate limiting for this IP
                    loginAttempts.delete(ip);

                    // Generate a cryptographically secure random session ID
                    const sessionId = crypto.randomBytes(32).toString('hex');
                    activeSessions.set(sessionId, true);
                    
                    const cookieExpires = new Date(Date.now() + 86400000).toUTCString(); // 1 day
                    res.writeHead(200, {
                        'Set-Cookie': `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Expires=${cookieExpires}; HttpOnly; SameSite=Strict`,
                        'Content-Type': 'application/json'
                    });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    // Failure: Increment failed attempts count
                    let currentAttempt = loginAttempts.get(ip) || { count: 0, blockUntil: 0 };
                    currentAttempt.count += 1;
                    
                    if (currentAttempt.count >= 5) {
                        currentAttempt.blockUntil = Date.now() + 5 * 60 * 1000; // block for 5 minutes
                        loginAttempts.set(ip, currentAttempt);
                        res.writeHead(429, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Too many failed attempts. Login blocked for 5 minutes.' }));
                    } else {
                        loginAttempts.set(ip, currentAttempt);
                        const remaining = 5 - currentAttempt.count;
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: `Invalid password. ${remaining} attempts remaining.` }));
                    }
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Bad Request');
            }
        });
        return;
    }

    // POST /api/contact (Contact message submission with IP rate-limiting)
    if (pathname === '/api/contact' && method === 'POST') {
        const ip = getClientIp(req);
        
        // Rate-limiting check: only 1 message per 60 seconds from the same IP
        const lastSubmitted = contactSubmissions.get(ip);
        const LIMIT_INTERVAL = 60 * 1000; // 60 seconds
        if (lastSubmitted && (Date.now() - lastSubmitted < LIMIT_INTERVAL)) {
            const waitSeconds = Math.ceil((LIMIT_INTERVAL - (Date.now() - lastSubmitted)) / 1000);
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: `Transmission rate limit exceeded. Please wait ${waitSeconds} seconds before sending another signal.` 
            }));
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const name = (data.name || '').trim();
                const email = (data.email || '').trim();
                const message = (data.message || '').trim();

                // Validation
                if (!name || !email || !message) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'All fields (Name, Email, Message) are required.' }));
                    return;
                }

                if (name.length > 100 || email.length > 100 || message.length > 5000) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Input length constraints exceeded.' }));
                    return;
                }

                // Record submission in database
                const db = readDatabase();
                const newContact = {
                    id: 'c_' + Date.now(),
                    name,
                    email,
                    message,
                    date: new Date().toISOString(),
                    ip: ip
                };
                db.contacts.push(newContact);
                writeDatabase(db);

                // Update rate limit timestamp
                contactSubmissions.set(ip, Date.now());

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Signal transmitted successfully.' }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Malformed JSON request.' }));
            }
        });
        return;
    }

    // GET /api/projects
    if (pathname === '/api/projects' && method === 'GET') {
        const db = readDatabase();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.projects));
        return;
    }

    // POST /api/projects (gate validation)
    if (pathname === '/api/projects' && method === 'POST') {
        if (!isAuthorized(req)) {
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            res.end('Unauthorized');
            return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const db = readDatabase();
                const newProj = JSON.parse(body);
                newProj.id = 'p_' + Date.now();
                db.projects.push(newProj);
                writeDatabase(db);
                syncLlmProfileAndSitemapDebounced();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, project: newProj }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Bad Request Data');
            }
        });
        return;
    }

    // DELETE /api/projects/:id (gate validation)
    const projDeleteMatch = pathname.match(/^\/api\/projects\/([a-zA-Z0-9_-]+)$/);
    if (projDeleteMatch && method === 'DELETE') {
        if (!isAuthorized(req)) {
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            res.end('Unauthorized');
            return;
        }
        const id = projDeleteMatch[1];
        const db = readDatabase();
        const idx = db.projects.findIndex(p => p.id === id);
        if (idx !== -1) {
            db.projects.splice(idx, 1);
            writeDatabase(db);
            syncLlmProfileAndSitemapDebounced();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Project Not Found');
        }
        return;
    }

    // GET /api/blogs
    if (pathname === '/api/blogs' && method === 'GET') {
        const db = readDatabase();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.blogs));
        return;
    }

    // POST /api/blogs (gate validation)
    if (pathname === '/api/blogs' && method === 'POST') {
        if (!isAuthorized(req)) {
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            res.end('Unauthorized');
            return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const db = readDatabase();
                const newBlog = JSON.parse(body);
                newBlog.id = 'b_' + Date.now();
                newBlog.date = new Date().toISOString().split('T')[0];
                db.blogs.push(newBlog);
                writeDatabase(db);
                syncLlmProfileAndSitemapDebounced();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, blog: newBlog }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Bad Request Data');
            }
        });
        return;
    }

    // DELETE /api/blogs/:id (gate validation)
    const blogDeleteMatch = pathname.match(/^\/api\/blogs\/([a-zA-Z0-9_-]+)$/);
    if (blogDeleteMatch && method === 'DELETE') {
        if (!isAuthorized(req)) {
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            res.end('Unauthorized');
            return;
        }
        const id = blogDeleteMatch[1];
        const db = readDatabase();
        const idx = db.blogs.findIndex(b => b.id === id);
        if (idx !== -1) {
            db.blogs.splice(idx, 1);
            writeDatabase(db);
            syncLlmProfileAndSitemapDebounced();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Blog Not Found');
        }
        return;
    }

    // ==========================================================================
    // 4. STATIC FILE SERVING
    // ==========================================================================
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    
    // Security check
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden access');
        return;
    }

    // Block access to server code, DB file, and configuration files
    const blockedFiles = ['server.js', 'db.json', 'package.json', 'package-lock.json', '.git', '.env'];
    const requestedFile = path.basename(filePath).toLowerCase();
    if (blockedFiles.includes(requestedFile) || requestedFile.startsWith('.')) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden access');
        return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Page Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Internal Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.on('upgrade', (req, socket, head) => {
    if (req.url.includes('/socket.io') || req.url.startsWith('/projects/hidden-agenda')) {
        const proxyReq = http.request({
            hostname: '127.0.0.1',
            port: GAME_PORT,
            path: req.url,
            method: req.method,
            headers: req.headers
        });

        proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
            let resHeaders = `HTTP/1.1 101 Switching Protocols\r\n`;
            for (const [k, v] of Object.entries(proxyRes.headers)) {
                if (Array.isArray(v)) {
                    v.forEach(val => resHeaders += `${k}: ${val}\r\n`);
                } else {
                    resHeaders += `${k}: ${v}\r\n`;
                }
            }
            resHeaders += `\r\n`;
            socket.write(resHeaders);
            if (proxyHead && proxyHead.length) socket.write(proxyHead);
            proxySocket.pipe(socket);
            socket.pipe(proxySocket);
        });

        proxyReq.on('error', () => {
            socket.destroy();
        });

        proxyReq.end();
    }
});

server.listen(PORT, () => {
    syncLlmProfileAndSitemap();
    startGameProcess();
    console.log(`Server listening at http://localhost:${PORT}/`);
});
