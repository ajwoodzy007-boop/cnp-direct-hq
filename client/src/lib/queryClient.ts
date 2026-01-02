import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    // Try to parse as JSON to extract error message
    try {
      const json = JSON.parse(text);
      throw new Error(json.error || json.message || text);
    } catch (parseError) {
      // If not JSON, use the text as-is (or statusText if text is empty)
      throw new Error(text || res.statusText);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle queryKeys that start with '/' (absolute paths) vs array parts
    let url: string;
    if (queryKey[0] && typeof queryKey[0] === 'string' && queryKey[0].startsWith('/')) {
      // Absolute path like ['/api/market/sentinel']
      url = queryKey[0];
      // Append additional queryKey parts if any
      if (queryKey.length > 1) {
        url += '/' + queryKey.slice(1).join('/');
      }
      // Use relative paths in production, absolute in development
      // No localhost prefix needed - browser handles relative paths correctly
    } else {
      // Array parts like ['api', 'chart', 'SPY'] or ['chart', 'SPY'] or ['chart-data', 'SPY']
      // Special handling for chart queries - redirect to correct endpoint
      const firstKey = queryKey[0] as string;
      const isChartQuery = firstKey === 'chart' || 
                          firstKey?.startsWith('chart-') || 
                          (firstKey === 'api' && queryKey[1] === 'chart');
      
      if (isChartQuery) {
        // Find the ticker (last element that's not 'chart', 'data', 'chart-data', etc.)
        const ticker = queryKey.find((key, idx) => {
          const keyStr = String(key);
          return idx > 0 && 
                 keyStr !== 'chart' && 
                 keyStr !== 'data' && 
                 keyStr !== 'chart-data' &&
                 keyStr.length <= 10 && // Tickers are typically 1-5 chars
                 /^[A-Z0-9]+$/.test(keyStr.toUpperCase()); // Valid ticker format
        }) as string | undefined;
        
        if (ticker) {
          // Use the correct chart endpoint format
          url = `/api/market/chart/${ticker.toUpperCase()}`;
        } else {
          // Fallback to joined path
          const relativePath = '/' + queryKey.join("/");
          url = relativePath;
        }
      } else {
        // Use relative paths - browser handles correctly in both dev and prod
        const relativePath = '/' + queryKey.join("/");
        url = relativePath;
      }
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 60 * 1000, // 1 minute - allows fresh data for trading prices
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
