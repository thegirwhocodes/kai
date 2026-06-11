export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface WebSearchResponse {
  provider: string;
  results: WebSearchResult[];
  answer?: string;
}

export async function searchWeb({
  query,
  maxResults = 5,
  domains,
}: {
  query: string;
  maxResults?: number;
  domains?: string[];
}): Promise<WebSearchResponse> {
  const q = withDomains(query.trim(), domains);
  const count = Math.min(10, Math.max(1, maxResults));
  if (!q) return { provider: "none", results: [] };

  if (process.env.BRAVE_SEARCH_API_KEY) return braveSearch(q, count);
  if (process.env.TAVILY_API_KEY) return tavilySearch(q, count, domains);
  if (process.env.SERPER_API_KEY) return serperSearch(q, count);
  if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
    return googleSearch(q, count);
  }
  return duckDuckGoHtmlSearch(q, count);
}

async function braveSearch(query: string, count: number): Promise<WebSearchResponse> {
  const url =
    "https://api.search.brave.com/res/v1/web/search?" +
    new URLSearchParams({ q: query, count: String(count), text_decorations: "false" });
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY!,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Brave search failed: ${data.message ?? res.status}`);
  return {
    provider: "brave",
    results: (data.web?.results ?? []).slice(0, count).map(
      (item: { title?: string; url?: string; description?: string }) => ({
        title: item.title ?? "(untitled)",
        url: item.url ?? "",
        snippet: item.description ?? "",
        source: hostname(item.url),
      }),
    ),
  };
}

async function tavilySearch(
  query: string,
  count: number,
  domains?: string[],
): Promise<WebSearchResponse> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      max_results: count,
      search_depth: "basic",
      include_answer: true,
      include_raw_content: false,
      include_domains: domains?.length ? domains : undefined,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Tavily search failed: ${data.error ?? res.status}`);
  return {
    provider: "tavily",
    answer: data.answer,
    results: (data.results ?? []).slice(0, count).map(
      (item: { title?: string; url?: string; content?: string }) => ({
        title: item.title ?? "(untitled)",
        url: item.url ?? "",
        snippet: item.content ?? "",
        source: hostname(item.url),
      }),
    ),
  };
}

async function serperSearch(query: string, count: number): Promise<WebSearchResponse> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": process.env.SERPER_API_KEY!,
    },
    body: JSON.stringify({ q: query, num: count }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Serper search failed: ${data.message ?? res.status}`);
  return {
    provider: "serper",
    results: (data.organic ?? []).slice(0, count).map(
      (item: { title?: string; link?: string; snippet?: string }) => ({
        title: item.title ?? "(untitled)",
        url: item.link ?? "",
        snippet: item.snippet ?? "",
        source: hostname(item.link),
      }),
    ),
  };
}

async function googleSearch(query: string, count: number): Promise<WebSearchResponse> {
  const url =
    "https://www.googleapis.com/customsearch/v1?" +
    new URLSearchParams({
      key: process.env.GOOGLE_SEARCH_API_KEY!,
      cx: process.env.GOOGLE_SEARCH_ENGINE_ID!,
      q: query,
      num: String(Math.min(10, count)),
    });
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google search failed: ${data.error?.message ?? res.status}`);
  }
  return {
    provider: "google_custom_search",
    results: (data.items ?? []).slice(0, count).map(
      (item: { title?: string; link?: string; snippet?: string }) => ({
        title: item.title ?? "(untitled)",
        url: item.link ?? "",
        snippet: item.snippet ?? "",
        source: hostname(item.link),
      }),
    ),
  };
}

async function duckDuckGoSearch(
  query: string,
  count: number,
): Promise<WebSearchResponse> {
  const url =
    "https://api.duckduckgo.com/?" +
    new URLSearchParams({
      q: query,
      format: "json",
      no_html: "1",
      skip_disambig: "1",
    });
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(`DuckDuckGo search failed: ${res.status}`);
  const related = flattenTopics(data.RelatedTopics ?? []);
  const abstractResult =
    data.AbstractURL && data.AbstractText
      ? [
          {
            title: data.Heading || query,
            url: data.AbstractURL,
            snippet: data.AbstractText,
            source: hostname(data.AbstractURL),
          },
        ]
      : [];
  return {
    provider: "duckduckgo_instant_answer",
    answer: data.AbstractText || undefined,
    results: [...abstractResult, ...related].slice(0, count),
  };
}

async function duckDuckGoHtmlSearch(
  query: string,
  count: number,
): Promise<WebSearchResponse> {
  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Kai/1.0 (+https://heykai.vercel.app)",
    },
    body: new URLSearchParams({ q: query }),
  });
  if (!res.ok) return duckDuckGoSearch(query, count);
  const html = await res.text();
  const results = parseDuckDuckGoHtml(html).slice(0, count);
  if (!results.length) return duckDuckGoSearch(query, count);
  return { provider: "duckduckgo_html", results };
}

function parseDuckDuckGoHtml(html: string): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  const pattern =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const url = decodeDuckUrl(htmlDecode(match[1]));
    const title = htmlToText(match[2]);
    const snippet = htmlToText(match[3]);
    if (url && title) {
      results.push({ title, url, snippet, source: hostname(url) });
    }
  }
  return results;
}

function flattenTopics(items: unknown[]): WebSearchResult[] {
  const out: WebSearchResult[] = [];
  for (const item of items as Array<{
    FirstURL?: string;
    Text?: string;
    Name?: string;
    Topics?: unknown[];
  }>) {
    if (item.Topics) out.push(...flattenTopics(item.Topics));
    if (item.FirstURL && item.Text) {
      out.push({
        title: item.Text.split(" - ")[0] || item.Name || "(untitled)",
        url: item.FirstURL,
        snippet: item.Text,
        source: hostname(item.FirstURL),
      });
    }
  }
  return out;
}

function withDomains(query: string, domains?: string[]): string {
  const clean = (domains ?? []).map((d) => d.trim()).filter(Boolean);
  if (!clean.length) return query;
  return `${query} (${clean.map((d) => `site:${d}`).join(" OR ")})`;
}

function decodeDuckUrl(value: string): string {
  try {
    const url = new URL(value, "https://duckduckgo.com");
    const uddg = url.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : url.href;
  } catch {
    return value;
  }
}

function htmlToText(value: string): string {
  return htmlDecode(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function htmlDecode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function hostname(value?: string): string {
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
