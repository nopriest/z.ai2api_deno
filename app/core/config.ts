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
  VISION_MODEL: string;
  
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

// 模型能力配置接口
export interface ModelCapabilities {
  vision: boolean;
  mcp: boolean;
  thinking: boolean;
}

// 模型配置接口
export interface ModelConfig {
  id: string;           // OpenAI API中的模型ID
  name: string;         // 显示名称
  upstreamId: string;   // Z.ai上游的模型ID
  capabilities: ModelCapabilities;
  defaultParams: {
    top_p: number;
    temperature: number;
    max_tokens?: number;
  };
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
  PRIMARY_MODEL: getEnvVar("PRIMARY_MODEL", "GLM-4.6"),
  THINKING_MODEL: getEnvVar("THINKING_MODEL", "GLM-4.6-Thinking"),
  SEARCH_MODEL: getEnvVar("SEARCH_MODEL", "GLM-4.6-Search"),
  AIR_MODEL: getEnvVar("AIR_MODEL", "GLM-4.5-Air"),
  VISION_MODEL: getEnvVar("VISION_MODEL", "GLM-4.5V"),
  
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

// 支持的模型配置
export const SUPPORTED_MODELS: ModelConfig[] = [
  {
    id: "GLM-4.6",
    name: "GLM-4.6",
    upstreamId: "GLM-4-6-API-V1",
    capabilities: {
      vision: false,
      mcp: true,
      thinking: true
    },
    defaultParams: {
      top_p: 0.95,
      temperature: 0.6,
      max_tokens: 200000
    }
  },
  {
    id: "GLM-4.5",
    name: "GLM-4.5",
    upstreamId: "0727-360B-API",
    capabilities: {
      vision: false,
      mcp: true,
      thinking: true
    },
    defaultParams: {
      top_p: 0.95,
      temperature: 0.6,
      max_tokens: 80000
    }
  },
  {
    id: "GLM-4.5V",
    name: "GLM-4.5V",
    upstreamId: "glm-4.5v",
    capabilities: {
      vision: true,
      mcp: false,
      thinking: true
    },
    defaultParams: {
      top_p: 0.6,
      temperature: 0.8
    }
  },
  {
    id: "GLM-4.5-Air",
    name: "GLM-4.5-Air",
    upstreamId: "0727-106B-API",
    capabilities: {
      vision: false,
      mcp: true,
      thinking: true
    },
    defaultParams: {
      top_p: 0.95,
      temperature: 0.6,
      max_tokens: 80000
    }
  }
];

// 根据模型ID获取配置
export function getModelConfig(modelId: string): ModelConfig {
  // 标准化模型ID，处理不同客户端的大小写差异
  const normalizedModelId = normalizeModelId(modelId);
  const found = SUPPORTED_MODELS.find(m => m.id === normalizedModelId);
  
  if (!found) {
    debugLog("⚠️ 未找到模型配置: %s (标准化后: %s)，使用默认模型: %s", 
      modelId, normalizedModelId, SUPPORTED_MODELS[0].name);
  }
  
  return found || SUPPORTED_MODELS[0];
}

/**
 * 标准化模型ID，处理不同客户端的命名差异
 */
export function normalizeModelId(modelId: string): string {
  const normalized = modelId.toLowerCase().trim();
  
  // 处理常见的模型ID映射
  const modelMappings: Record<string, string> = {
    // GLM-4.6 映射
    'glm-4-6-api-v1': 'GLM-4.6',
    'glm-4.6': 'GLM-4.6',
    'glm4.6': 'GLM-4.6',
    'glm_4.6': 'GLM-4.6',
    // GLM-4.5V 映射
    'glm-4.5v': 'GLM-4.5V',
    'glm4.5v': 'GLM-4.5V',
    'glm_4.5v': 'GLM-4.5V',
    'gpt-4-vision-preview': 'GLM-4.5V',  // 向后兼容
    // GLM-4.5 映射
    '0727-360b-api': 'GLM-4.5',
    'glm-4.5': 'GLM-4.5',
    'glm4.5': 'GLM-4.5',
    'glm_4.5': 'GLM-4.5',
    'gpt-4': 'GLM-4.5'  // 向后兼容
  };
  
  const mapped = modelMappings[normalized];
  if (mapped) {
    debugLog("🔄 模型ID映射: %s → %s", modelId, mapped);
    return mapped;
  }
  
  return normalized;
}

// 导入debugLog函数（避免循环依赖）
function debugLog(format: string, ...args: unknown[]): void {
  if (config.DEBUG_LOGGING) {
    console.log(`[DEBUG] ${format}`, ...args);
  }
}
