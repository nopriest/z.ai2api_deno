/**
 * Utility functions for the application
 */

import { config } from "../core/config.ts";

// 全局 UserAgent 实例，避免每次调用都创建新实例
let _userAgentInstance: any = null;

async function getUserAgentInstance() {
  if (_userAgentInstance === null) {
    // 使用简单的随机User-Agent生成
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
    ];
    _userAgentInstance = {
      chrome: userAgents[0],
      edge: userAgents[1],
      firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
      safari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
      random: userAgents[Math.floor(Math.random() * userAgents.length)]
    };
  }
  return _userAgentInstance;
}

export function debugLog(message: string, ...args: any[]): void {
  /**Log debug message if debug mode is enabled*/
  if (config.DEBUG_LOGGING) {
    if (args.length > 0) {
      console.log(`[DEBUG] ${message}`, ...args);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

export function generateRequestIds(): [string, string] {
  /**Generate unique IDs for chat and message*/
  const timestamp = Math.floor(Date.now() / 1000);
  const chatId = `${timestamp * 1000}-${timestamp}`;
  const msgId = String(timestamp * 1000000);
  return [chatId, msgId];
}

export async function getBrowserHeaders(refererChatId: string = ""): Promise<Record<string, string>> {
  /**Get browser headers for API requests with dynamic User-Agent*/
  
  // 获取 UserAgent 实例
  const ua = await getUserAgentInstance();
  
  // 随机选择一个浏览器类型，偏向使用 Chrome 和 Edge
  const browserChoices = ['chrome', 'chrome', 'chrome', 'edge', 'edge', 'firefox', 'safari'];
  const browserType = browserChoices[Math.floor(Math.random() * browserChoices.length)];
  
  let userAgent: string;
  try {
    // 根据浏览器类型获取 User-Agent
    switch (browserType) {
      case 'chrome':
        userAgent = ua.chrome;
        break;
      case 'edge':
        userAgent = ua.edge;
        break;
      case 'firefox':
        userAgent = ua.firefox;
        break;
      case 'safari':
        userAgent = ua.safari;
        break;
      default:
        userAgent = ua.random;
    }
  } catch {
    // 如果获取失败，使用随机 User-Agent
    userAgent = ua.random;
  }
  
  // 提取浏览器版本信息
  let chromeVersion = "139"; // 默认版本
  let edgeVersion = "139";
  
  if (userAgent.includes("Chrome/")) {
    try {
      chromeVersion = userAgent.split("Chrome/")[1].split(".")[0];
    } catch {
      // 忽略错误
    }
  }
  
  let secChUa: string | undefined;
  if (userAgent.includes("Edg/")) {
    try {
      edgeVersion = userAgent.split("Edg/")[1].split(".")[0];
      // Edge 基于 Chromium，使用 Edge 特定的 sec-ch-ua
      secChUa = `"Microsoft Edge";v="${edgeVersion}", "Chromium";v="${chromeVersion}", "Not_A Brand";v="24"`;
    } catch {
      secChUa = `"Not_A Brand";v="8", "Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}"`;
    }
  } else if (userAgent.includes("Firefox/")) {
    // Firefox 不使用 sec-ch-ua
    secChUa = undefined;
  } else {
    // Chrome 或其他基于 Chromium 的浏览器
    secChUa = `"Not_A Brand";v="8", "Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}"`;
  }
  
  // 构建动态 Headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "User-Agent": userAgent,
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "X-FE-Version": "prod-fe-1.0.70",
    "Origin": config.CLIENT_HEADERS["Origin"],
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
  };
  
  // 只有基于 Chromium 的浏览器才添加 sec-ch-ua
  if (secChUa) {
    headers["sec-ch-ua"] = secChUa;
  }
  
  // 添加 Referer
  if (refererChatId) {
    headers["Referer"] = `${config.CLIENT_HEADERS['Origin']}/c/${refererChatId}`;
  }
  
  // 调试日志
  if (config.DEBUG_LOGGING) {
    debugLog(`使用 User-Agent: ${userAgent.substring(0, 100)}...`);
  }
  
  return headers;
}

export async function getAnonymousToken(): Promise<string> {
  /**Get anonymous token for authentication*/
  const headers = await getBrowserHeaders();
  headers["Accept"] = "*/*";
  headers["Accept-Language"] = "zh-CN,zh;q=0.9";
  headers["Referer"] = `${config.CLIENT_HEADERS['Origin']}/`;
  
  try {
    const response = await fetch(
      `${config.CLIENT_HEADERS['Origin']}/api/v1/auths/`,
      {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(10000),
      }
    );
    
    if (!response.ok) {
      throw new Error(`anon token status=${response.status}`);
    }
    
    const data = await response.json();
    const token = data.token;
    if (!token) {
      throw new Error("anon token empty");
    }
    
    return token;
  } catch (error) {
    debugLog(`获取匿名token失败: ${error}`);
    throw error;
  }
}

export async function getAuthToken(): Promise<string> {
  /**Get authentication token (anonymous or fixed)*/
  if (config.ANONYMOUS_MODE) {
    try {
      const token = await getAnonymousToken();
      debugLog(`匿名token获取成功: ${token.substring(0, 10)}...`);
      return token;
    } catch (error) {
      debugLog(`匿名token获取失败，回退固定token: ${error}`);
    }
  }
  
  return config.BACKUP_TOKEN;
}

export function transformThinkingContent(content: string): string {
  /**Transform thinking content according to configuration*/
  // Remove summary tags
  content = content.replace(/<summary>[\s\S]*?<\/summary>/g, '');
  // Clean up remaining tags
  content = content.replace(/<\/thinking>/g, "").replace(/<Full>/g, "").replace(/<\/Full>/g, "");
  content = content.trim();
  
  if (config.THINKING_PROCESSING === "think") {
    content = content.replace(/<details[^>]*>/g, '<span>');
    content = content.replace(/<\/details>/g, "</span>");
  } else if (config.THINKING_PROCESSING === "strip") {
    content = content.replace(/<details[^>]*>/g, '');
    content = content.replace(/<\/details>/g, "");
  }
  
  // Remove line prefixes
  content = content.replace(/^> /gm, '');
  content = content.replace(/\n> /g, "\n");
  
  return content.trim();
}

export async function callUpstreamApi(
  upstreamReq: any,
  chatId: string,
  authToken: string
): Promise<Response> {
  /**Call upstream API with proper headers*/
  const headers = await getBrowserHeaders(chatId);
  headers["Authorization"] = `Bearer ${authToken}`;
  
  debugLog(`调用上游API: ${config.API_ENDPOINT}`);
  debugLog(`上游请求体: ${JSON.stringify(upstreamReq)}`);
  
  const response = await fetch(config.API_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(upstreamReq),
    signal: AbortSignal.timeout(60000),
  });
  
  debugLog(`上游响应状态: ${response.status}`);
  return response;
}
