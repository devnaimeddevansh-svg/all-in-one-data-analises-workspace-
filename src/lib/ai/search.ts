export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export async function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return [
      {
        title: "Web search unavailable",
        url: "",
        content:
          "Configure TAVILY_API_KEY to enable web search. Research will proceed with AI knowledge only.",
      },
    ];
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      include_answer: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    results: Array<{ title: string; url: string; content: string; score: number }>;
    answer?: string;
  };

  const results: SearchResult[] = data.results.map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content,
    score: r.score,
  }));

  if (data.answer) {
    results.unshift({
      title: "AI Summary",
      url: "",
      content: data.answer,
    });
  }

  return results;
}
