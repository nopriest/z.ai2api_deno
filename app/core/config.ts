/**
 * Application configuration module
 */

export interface Config {
  // API Configuration
  API_ENDPOINT: string;
  AUTH_TOKEN: string;
  BACKUP_TOKEN: string;
  
  // Model Configuration
  PRIMARY_MODEL: string;
  THINKING_MODEL: string;
  SEARCH_MODEL: string;
  AIR_MODEL: string;
  
  // Server Configuration
  LISTEN_PORT: number;
  DEBUG_LOGGING: boolean;
  
  // Feature Configuration
  THINKING_PROCESSING: string; // strip: 去除<details>标签；think: 转为<span>标签；raw: 保留原样
  ANONYMOUS_MODE: boolean;
  TOOL_SUPPORT: boolean;
  SCAN_LIMIT: number;
  SKIP_AUTH_TOKEN: boolean;
  
  // Browser Headers
  CLIENT_HEADERS: Record<string, string>;
}

function getEnvVar(key: string, defaultValue: string): string {
  return Deno.env.get(key) ?? defaultValue;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = Deno.env.get(key);
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === "true";
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = Deno.env.get(key);
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const config: Config = {
  // API Configuration
  API_ENDPOINT: getEnvVar("API_ENDPOINT", "https://chat.z.ai/api/chat/completions"),
  AUTH_TOKEN: getEnvVar("AUTH_TOKEN", "sk-your-api-key"),
  BACKUP_TOKEN: getEnvVar("BACKUP_TOKEN", "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjMxNmJjYjQ4LWZmMmYtNGExNS04NTNkLWYyYTI5YjY3ZmYwZiIsImVtYWlsIjoiR3Vlc3QtMTc1NTg0ODU4ODc4OEBndWVzdC5jb20ifQ.PktllDySS3trlyuFpTeIZf-7hl8Qu1qYF3BxjgIul0BrNux2nX9hVzIjthLXKMWAf9V0qM8Vm_iyDqkjPGsaiQ"),
  
  // Model Configuration
  PRIMARY_MODEL: getEnvVar("PRIMARY_MODEL", "GLM-4.5"),
  THINKING_MODEL: getEnvVar("THINKING_MODEL", "GLM-4.5-Thinking"),
  SEARCH_MODEL: getEnvVar("SEARCH_MODEL", "GLM-4.5-Search"),
  AIR_MODEL: getEnvVar("AIR_MODEL", "GLM-4.5-Air"),
  
  // Server Configuration
  LISTEN_PORT: getEnvNumber("LISTEN_PORT", 8080),
  DEBUG_LOGGING: getEnvBool("DEBUG_LOGGING", true),
  
  // Feature Configuration
  THINKING_PROCESSING: getEnvVar("THINKING_PROCESSING", "think"),
  ANONYMOUS_MODE: getEnvBool("ANONYMOUS_MODE", true),
  TOOL_SUPPORT: getEnvBool("TOOL_SUPPORT", true),
  SCAN_LIMIT: getEnvNumber("SCAN_LIMIT", 200000),
  SKIP_AUTH_TOKEN: getEnvBool("SKIP_AUTH_TOKEN", false),
  
  // Browser Headers
  CLIENT_HEADERS: {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
    "Accept-Language": "zh-CN",
    "sec-ch-ua": '"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "X-FE-Version": "prod-fe-1.0.70",
    "Origin": "https://chat.z.ai",
  },
};
