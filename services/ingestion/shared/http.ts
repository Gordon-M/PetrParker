const DEFAULT_HEADERS = {
  'user-agent': 'PetrParkerIngestion/0.1 (+https://www.parks.ca.gov/)',
  accept: '*/*',
};

export interface FetchResult {
  finalUrl: string;
  status: number;
  contentType: string | null;
  body: Uint8Array;
}

export async function fetchBytes(url: string): Promise<FetchResult> {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return {
    finalUrl: response.url,
    status: response.status,
    contentType: response.headers.get('content-type'),
    body: new Uint8Array(await response.arrayBuffer()),
  };
}

export async function fetchText(url: string): Promise<FetchResult & { text: string }> {
  const result = await fetchBytes(url);
  const text = new TextDecoder().decode(result.body);

  return {
    ...result,
    text,
  };
}
