/**
 * SSE (Server-Sent Events) parser for streaming responses
 */

export interface SSEEvent {
  type: "data" | "event" | "id" | "retry";
  data?: any;
  event?: string;
  id?: string;
  retry?: number;
  raw?: string;
  is_json?: boolean;
}

export class SSEParser {
  private response: Response;
  private debugMode: boolean;
  private lineCount: number = 0;

  constructor(response: Response, debugMode: boolean = false) {
    this.response = response;
    this.debugMode = debugMode;
  }

  private debugLog(formatStr: string, ...args: any[]): void {
    if (this.debugMode) {
      if (args.length > 0) {
        console.log(`[SSE_PARSER] ${formatStr}`, ...args);
      } else {
        console.log(`[SSE_PARSER] ${formatStr}`);
      }
    }
  }

  async *iterEvents(): AsyncGenerator<SSEEvent, void, unknown> {
    this.debugLog("开始解析 SSE 流");

    if (!this.response.body) {
      throw new Error("Response body is null");
    }

    const reader = this.response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // Keep the last incomplete line in buffer

        for (const line of lines) {
          this.lineCount++;

          // Skip empty lines
          if (!line.trim()) {
            continue;
          }

          // Skip comment lines
          if (line.startsWith(":")) {
            continue;
          }

          // Parse field-value pairs
          const colonIndex = line.indexOf(":");
          if (colonIndex === -1) continue;

          const field = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();

          if (field === "data") {
            this.debugLog(`收到数据 (第${this.lineCount}行): ${value}`);

            // Try to parse JSON
            try {
              const data = JSON.parse(value);
              yield { type: "data", data, raw: value, is_json: true };
            } catch {
              yield { type: "data", data: value, raw: value, is_json: false };
            }
          } else if (field === "event") {
            yield { type: "event", event: value };
          } else if (field === "id") {
            yield { type: "id", id: value };
          } else if (field === "retry") {
            try {
              const retry = parseInt(value, 10);
              yield { type: "retry", retry };
            } catch {
              this.debugLog(`无效的 retry 值: ${value}`);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async *iterDataOnly(): AsyncGenerator<SSEEvent, void, unknown> {
    for await (const event of this.iterEvents()) {
      if (event.type === "data") {
        yield event;
      }
    }
  }

  async *iterJsonData<T = any>(validator?: (data: any) => T): AsyncGenerator<SSEEvent & { data: T }, void, unknown> {
    for await (const event of this.iterEvents()) {
      if (event.type === "data" && event.is_json !== false) {
        try {
          if (validator) {
            const validatedData = validator(event.data);
            yield { ...event, data: validatedData };
          } else {
            yield event as SSEEvent & { data: T };
          }
        } catch (error) {
          this.debugLog(`数据验证失败: ${error}`);
          continue;
        }
      }
    }
  }

  close(): void {
    // Response is automatically closed when the stream ends
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.close();
  }
}
