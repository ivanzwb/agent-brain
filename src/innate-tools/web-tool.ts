import type { InnateTool, ToolDefinition } from './types';

/** Capability boundaries in `WEB_TOOL_DEFINITIONS`; usage / sequencing: `fragments/web-business.md`. */
const WEB_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  http_get: {
    name: 'http_get',
    description: 'Fetch content from a URL using GET request. Returns the response body as text or JSON.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch',
        },
        headers: {
          type: 'object',
          description: 'Optional HTTP headers (e.g., { "User-Agent": "..." })',
        },
        timeout: {
          type: 'number',
          description: 'Request timeout in milliseconds (default: 30000)',
          default: 30000,
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
  },

  http_post: {
    name: 'http_post',
    description: 'Send a POST request to a URL with JSON body.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to POST to',
        },
        body: {
          type: 'object',
          description: 'JSON body to send',
        },
        headers: {
          type: 'object',
          description: 'Optional HTTP headers',
        },
        timeout: {
          type: 'number',
          description: 'Request timeout in milliseconds (default: 30000)',
          default: 30000,
        },
      },
      required: ['url', 'body'],
      additionalProperties: false,
    },
  },

  http_fetch_html: {
    name: 'http_fetch_html',
    description:
      'Fetch a page and extract readable text (and optionally links). For github.com repository URLs, uses the GitHub README API (raw Markdown) instead of scraping HTML.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch',
        },
        extractLinks: {
          type: 'boolean',
          description: 'Extract all links from the page (default: true)',
          default: true,
        },
        extractImages: {
          type: 'boolean',
          description: 'Extract image URLs from the page (default: false)',
          default: false,
        },
        timeout: {
          type: 'number',
          description: 'Request timeout in milliseconds (default: 30000)',
          default: 30000,
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
  },

  web_search: {
    name: 'web_search',
    description: 'Search the web for information. Returns relevant results with titles and snippets.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 5)',
          default: 5,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },

  web_scrape: {
    name: 'web_scrape',
    description: 'Scrape structured data from a webpage using CSS selectors or common patterns.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to scrape',
        },
        selectors: {
          type: 'object',
          description: 'CSS selectors mapping to field names (e.g., { "title": "h1", "price": ".price" })',
        },
        timeout: {
          type: 'number',
          description: 'Request timeout in milliseconds (default: 30000)',
          default: 30000,
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
  },
};

export { WEB_TOOL_DEFINITIONS };

/**
 * If `url` points at a normal GitHub repository page (not issues/wiki/blob/etc.),
 * return owner and repo for the REST README endpoint.
 */
function tryParseGitHubRepoRootForReadme(urlStr: string): { owner: string; repo: string } | null {
  let u: URL;
  try {
    u = new URL(urlStr.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (host !== 'github.com' && host !== 'www.github.com') return null;

  const parts = u.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0];
  let repo = parts[1].replace(/\.git$/i, '');
  if (!owner || !repo) return null;

  if (parts.length === 2) {
    return { owner, repo };
  }

  const third = parts[2].toLowerCase();
  if (third === 'tree') {
    return { owner, repo };
  }
  if (third === 'blob') {
    return null;
  }

  const skip = new Set([
    'issues',
    'pulls',
    'wiki',
    'discussions',
    'releases',
    'actions',
    'projects',
    'packages',
    'settings',
    'compare',
    'network',
    'graphs',
    'commits',
    'tags',
    'branches',
    'stargazers',
    'watchers',
    'forks',
    'search',
  ]);
  if (skip.has(third)) return null;

  return null;
}

/** GET /repos/{owner}/{repo}/readme as raw Markdown (no token; subject to GitHub unauthenticated rate limits). */
async function fetchGitHubReadmeMarkdown(
  owner: string,
  repo: string,
  timeout: number,
): Promise<{ ok: boolean; status: number; text: string; error?: string }> {
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`;
  const result = await fetchUrl(apiUrl, {
    method: 'GET',
    timeout,
    headers: {
      Accept: 'application/vnd.github.raw+json',
      'User-Agent': 'Mozilla/5.0 (compatible; agent-brain/1.0)',
    },
  });

  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      text: '',
      error: result.error ?? `HTTP ${result.status}`,
    };
  }

  const text = typeof result.data === 'string' ? result.data : String(result.data);
  return { ok: true, status: result.status, text };
}

async function fetchUrl(url: string, options: RequestInit & { timeout?: number } = {}): Promise<{ ok: boolean; status: number; data: string; error?: string }> {
  const { timeout = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let data: any;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      status: 0,
      data: '',
      error: err.message || 'Fetch failed',
    };
  }
}

export class HttpGetTool implements InnateTool {
  readonly definition: ToolDefinition = WEB_TOOL_DEFINITIONS.http_get;
  readonly actionCategory = 'web_fetch' as const;
  readonly permissionTargetArgs = ['url'];

  async execute(args: Record<string, unknown>): Promise<string> {
    const url = args['url'] as string;
    const headers = args['headers'] as Record<string, string> | undefined;
    const timeout = args['timeout'] as number || 30000;

    const result = await fetchUrl(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', ...headers },
      timeout,
    });

    if (result.ok) {
      const content = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
      return JSON.stringify({
        status: 'ok',
        url,
        statusCode: result.status,
        content: content.substring(0, 20000),
      });
    }

    return JSON.stringify({
      status: 'error',
      url,
      statusCode: result.status,
      error: result.error,
    });
  }
}

export class HttpPostTool implements InnateTool {
  readonly definition: ToolDefinition = WEB_TOOL_DEFINITIONS.http_post;
  readonly actionCategory = 'web_fetch' as const;
  readonly permissionTargetArgs = ['url'];

  async execute(args: Record<string, unknown>): Promise<string> {
    const url = args['url'] as string;
    const body = args['body'] as object;
    const headers = args['headers'] as Record<string, string> | undefined;
    const timeout = args['timeout'] as number || 30000;

    const result = await fetchUrl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', ...headers },
      body: JSON.stringify(body),
      timeout,
    });

    if (result.ok) {
      const content = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
      return JSON.stringify({
        status: 'ok',
        url,
        statusCode: result.status,
        content: content.substring(0, 20000),
      });
    }

    return JSON.stringify({
      status: 'error',
      url,
      statusCode: result.status,
      error: result.error,
    });
  }
}

export class HttpFetchHtmlTool implements InnateTool {
  readonly definition: ToolDefinition = WEB_TOOL_DEFINITIONS.http_fetch_html;
  readonly actionCategory = 'web_fetch' as const;
  readonly permissionTargetArgs = ['url'];

  async execute(args: Record<string, unknown>): Promise<string> {
    const url = args['url'] as string;
    const extractLinks = args['extractLinks'] !== false;
    const extractImages = args['extractImages'] === true;
    const timeout = args['timeout'] as number || 30000;

    const gh = tryParseGitHubRepoRootForReadme(url);
    if (gh) {
      const readme = await fetchGitHubReadmeMarkdown(gh.owner, gh.repo, timeout);
      if (readme.ok && readme.text.trim().length > 0) {
        const text = readme.text.length > 20000 ? `${readme.text.slice(0, 20000)}\n[... truncated]` : readme.text;
        return JSON.stringify({
          status: 'ok',
          url,
          source: 'github_readme_api',
          text,
        });
      }
    }

    const result = await fetchUrl(url, { method: 'GET', timeout, headers: { 'User-Agent': 'Mozilla/5.0' } });

    if (!result.ok) {
      return JSON.stringify({ status: 'error', url, error: result.error });
    }

    const html = typeof result.data === 'string' ? result.data : String(result.data);

    // Extract plain text, remove all HTML tags
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit text length
    text = text.substring(0, 8000);

    const response: Record<string, any> = {
      status: 'ok',
      url,
      text,
    };

    if (extractLinks) {
      const linkRegex = /href=["']([^"']+)["']/gi;
      const links: string[] = [];
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        try {
          const absoluteUrl = new URL(match[1], url).href;
          if (absoluteUrl.startsWith('http')) {
            links.push(absoluteUrl);
          }
        } catch {
          // skip invalid URLs
        }
      }
      response.links = [...new Set(links)].slice(0, 50);
    }

    if (extractImages) {
      const imgRegex = /src=["']([^"']+)["']/gi;
      const images: string[] = [];
      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        try {
          const absoluteUrl = new URL(match[1], url).href;
          if (absoluteUrl.startsWith('http')) {
            images.push(absoluteUrl);
          }
        } catch {
          // skip invalid URLs
        }
      }
      response.images = [...new Set(images)].slice(0, 30);
    }

    return JSON.stringify(response);
  }
}

export class WebSearchTool implements InnateTool {
  readonly definition: ToolDefinition = WEB_TOOL_DEFINITIONS.web_search;
  readonly actionCategory = 'web_search' as const;
  readonly permissionTargetArgs = ['query'];

  async execute(args: Record<string, unknown>): Promise<string> {
    const query = args['query'] as string;
    const limit = (args['limit'] as number) || 5;

    // Use DuckDuckGo HTML search (more reliable, no anti-scraping)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const result = await fetchUrl(searchUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!result.ok) {
      return JSON.stringify({ status: 'error', query, error: result.error });
    }

    const html = typeof result.data === 'string' ? result.data : String(result.data);
    const results: any[] = [];

    // DuckDuckGo HTML result parsing
    const resultRegex = /<a class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;
    let count = 0;
    while ((match = resultRegex.exec(html)) !== null && count < limit) {
      try {
        const url = decodeURIComponent(match[1].replace(/\/udd\?q=/, '').replace(/&amp;.*$/, ''));
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        const snippet = match[3].replace(/<[^>]+>/g, '').trim();

        if (url.startsWith('http')) {
          results.push({ url, title, snippet: snippet.substring(0, 200) });
          count++;
        }
      } catch {
        // skip malformed results
      }
    }

    if (results.length === 0) {
      // Alternative parsing method
      const altRegex = /<result[^>]*>[\s\S]*?href="([^"]+)"[^>]*>([\s\S]*?)<\/result>/gi;
      let altMatch;
      while ((altMatch = altRegex.exec(html)) !== null && results.length < limit) {
        try {
          const url = altMatch[1];
          if (url.startsWith('http')) {
            results.push({ url, title: 'Result', snippet: '' });
          }
        } catch {
          // skip
        }
      }
    }

    // Limit return size
    const summary = results.slice(0, limit).map(r => `${r.title}\n${r.url}\n${r.snippet || ''}`).join('\n---\n');
    const truncated = summary.length > 2000 ? summary.substring(0, 2000) + '...(truncated)' : summary;

    return JSON.stringify({
      status: 'ok',
      query,
      count: results.length,
      summary: truncated,
      results: results.slice(0, limit),
    });
  }
}

export class WebScrapeTool implements InnateTool {
  readonly definition: ToolDefinition = WEB_TOOL_DEFINITIONS.web_scrape;
  readonly actionCategory = 'web_fetch' as const;
  readonly permissionTargetArgs = ['url'];

  async execute(args: Record<string, unknown>): Promise<string> {
    const url = args['url'] as string;
    const selectors = args['selectors'] as Record<string, string> | undefined;
    const timeout = args['timeout'] as number || 30000;

    const result = await fetchUrl(url, {
      timeout,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!result.ok) {
      return JSON.stringify({ status: 'error', url, error: result.error });
    }

    const html = typeof result.data === 'string' ? result.data : String(result.data);

    // Default extract plain text
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);

    const data: Record<string, string[]> = {};

    if (selectors) {
      for (const [field, selector] of Object.entries(selectors)) {
        const matches: string[] = [];
        let regex: RegExp;

        if (selector.startsWith('.')) {
          regex = new RegExp(`<[^>]+class=["'][^"']*${selector.slice(1)}[^"']*["'][^>]*>([\\s\\S]*?)</[^>]+>`, 'gi');
        } else if (selector.startsWith('#')) {
          regex = new RegExp(`<[^>]+id=["']${selector.slice(1)}["'][^>]*>([\\s\\S]*?)</[^>]+>`, 'gi');
        } else {
          regex = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)</${selector}>`, 'gi');
        }

        let match;
        while ((match = regex.exec(html)) !== null) {
          const content = match[1].replace(/<[^>]+>/g, '').trim();
          if (content) {
            matches.push(content);
          }
        }

        data[field] = matches.slice(0, 20);
      }
    }

    return JSON.stringify({
      status: 'ok',
      url,
      text,
      data,
    });
  }
}
