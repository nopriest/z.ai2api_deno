/**
 * OpenAI API endpoints
 */

import { Router } from 'oak/mod.ts';
import { config, getModelConfig, SUPPORTED_MODELS } from './config.ts';
import {
  OpenAIRequest,
  Message,
  UpstreamRequest,
  ModelItem,
  ModelsResponse,
  Model,
  OpenAIRequestSchema,
} from '../models/schemas.ts';
import {
  debugLog,
  generateRequestIds,
  getAuthToken,
} from '../utils/helpers.ts';
import { processMessagesWithTools, contentToString } from '../utils/tools.ts';
import {
  StreamResponseHandler,
  NonStreamResponseHandler,
} from './response_handlers.ts';

export const openaiRouter = new Router();

openaiRouter.get('/models', async (ctx) => {
  /**List available models*/
  const currentTime = Math.floor(Date.now() / 1000);
  const response: ModelsResponse = {
    object: 'list',
    data: SUPPORTED_MODELS.map(model => ({
      id: model.id,
      object: 'model',
      created: currentTime,
      owned_by: 'z.ai',
    })),
  };
  ctx.response.body = response;
});

openaiRouter.post('/chat/completions', async (ctx) => {
  /**Handle chat completion requests*/
  debugLog('收到chat completions请求');

  try {
    // Get authorization header
    const authorization = ctx.request.headers.get('authorization');

    // Validate API key (skip if SKIP_AUTH_TOKEN is enabled)
    if (!config.SKIP_AUTH_TOKEN) {
      if (!authorization || !authorization.startsWith('Bearer ')) {
        debugLog('缺少或无效的Authorization头');
        ctx.response.status = 401;
        ctx.response.body = {
          error: 'Missing or invalid Authorization header',
        };
        return;
      }

      const apiKey = authorization.substring(7);
      if (apiKey !== config.AUTH_TOKEN) {
        debugLog(`无效的API key: ${apiKey}`);
        ctx.response.status = 401;
        ctx.response.body = { error: 'Invalid API key' };
        return;
      }

      debugLog(`API key验证通过，AUTH_TOKEN=${apiKey.substring(0, 8)}......`);
    } else {
      debugLog('SKIP_AUTH_TOKEN已启用，跳过API key验证');
    }

    // Parse and validate request body
    const requestBody = await ctx.request.body().value;
    const request = OpenAIRequestSchema.parse(requestBody);

    debugLog(
      `请求解析成功 - 模型: ${request.model}, 流式: ${request.stream}, 消息数: ${request.messages.length}`
    );

    // Generate IDs
    const [chatId, msgId] = generateRequestIds();

    // Process messages with tools
    const processedMessages = processMessagesWithTools(
      request.messages.map((m) => ({ ...m })),
      request.tools,
      request.tool_choice
    );

    // Convert back to Message objects
    const upstreamMessages: Message[] = [];
    for (const msg of processedMessages) {
      const content = contentToString(msg.content);

      upstreamMessages.push({
        role: msg.role,
        content: content,
        reasoning_content: msg.reasoning_content,
      });
    }

    // Get model configuration
    const modelConfig = getModelConfig(request.model);
    debugLog(`使用模型配置: ${modelConfig.name} (${modelConfig.upstreamId})`);
    
    // Determine model features
    const isThinking = modelConfig.capabilities.thinking;
    const isSearch = request.model === config.SEARCH_MODEL;
    const isAir = request.model === config.AIR_MODEL;
    const searchMcp = isSearch ? 'deep-web-search' : '';

    // Use model configuration
    const upstreamModelId = modelConfig.upstreamId;
    const upstreamModelName = modelConfig.name;

    // Build upstream request
    const upstreamReq: UpstreamRequest = {
      stream: true, // Always use streaming from upstream
      chat_id: chatId,
      id: msgId,
      model: upstreamModelId, // Dynamic upstream model ID
      messages: upstreamMessages,
      params: modelConfig.defaultParams,
      features: {
        enable_thinking: isThinking,
        web_search: isSearch,
        auto_web_search: isSearch,
        preview_mode: modelConfig.capabilities.vision,
      },
      background_tasks: {
        title_generation: false,
        tags_generation: false,
      },
      mcp_servers: modelConfig.capabilities.mcp ? (searchMcp ? [searchMcp] : []) : [],
      model_item: {
        id: upstreamModelId,
        name: upstreamModelName,
        owned_by: 'openai',
        openai: {
          id: upstreamModelId,
          name: upstreamModelId,
          owned_by: "openai",
          openai: {
            id: upstreamModelId
          },
          urlIdx: 1
        },
        urlIdx: 1,
        info: {
          id: upstreamModelId,
          user_id: "api-user",
          base_model_id: null,
          name: upstreamModelName,
          params: modelConfig.defaultParams,
          meta: {
            profile_image_url: "/static/favicon.png",
            description: modelConfig.capabilities.vision ? "Advanced visual understanding and analysis" : "Most advanced model, proficient in coding and tool use",
            capabilities: {
              vision: modelConfig.capabilities.vision,
              citations: false,
              preview_mode: modelConfig.capabilities.vision,
              web_search: false,
              language_detection: false,
              restore_n_source: false,
              mcp: modelConfig.capabilities.mcp,
              file_qa: modelConfig.capabilities.mcp,
              returnFc: true,
              returnThink: modelConfig.capabilities.thinking,
              think: modelConfig.capabilities.thinking
            }
          }
        }
      },
      tool_servers: [],
      variables: {
        '{{USER_NAME}}': 'User',
        '{{USER_LOCATION}}': 'Unknown',
        '{{CURRENT_DATETIME}}': new Date()
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19),
      },
    };

    // Get authentication token
    const authToken = await getAuthToken();

    // Check if tools are enabled and present
    const hasTools =
      config.TOOL_SUPPORT &&
      request.tools &&
      request.tools.length > 0 &&
      request.tool_choice !== 'none';

    // Handle response based on stream flag
    if (request.stream) {
      const handler = new StreamResponseHandler(
        upstreamReq,
        chatId,
        authToken,
        hasTools
      );

      // Set SSE headers
      ctx.response.headers.set('Content-Type', 'text/event-stream');
      ctx.response.headers.set('Cache-Control', 'no-cache');
      ctx.response.headers.set('Connection', 'keep-alive');
      ctx.response.headers.set('Access-Control-Allow-Origin', '*');

      // Create a readable stream with better error handling
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let hasStarted = false;
            for await (const chunk of handler.handle()) {
              hasStarted = true;
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          } catch (error) {
            debugLog(`流式响应处理错误: ${error}`);
            // 发送错误信息到客户端
            try {
              const errorChunk = `data: {"error": {"message": "Stream processing error", "type": "internal_error"}}\n\n`;
              controller.enqueue(new TextEncoder().encode(errorChunk));
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            } catch (controllerError) {
              debugLog(`控制器错误: ${controllerError}`);
            }
            controller.close();
          }
        },
        cancel() {
          debugLog('客户端取消了流式响应');
        },
      });

      ctx.response.body = stream;
    } else {
      try {
        const handler = new NonStreamResponseHandler(
          upstreamReq,
          chatId,
          authToken,
          hasTools
        );
        const response = await handler.handle();

        // Copy response properties
        ctx.response.status = response.status;
        ctx.response.headers = response.headers;
        ctx.response.body = await response.text();
      } catch (nonStreamError) {
        debugLog(`非流式响应处理错误: ${nonStreamError}`);
        ctx.response.status = 500;
        ctx.response.body = {
          error: `Non-stream processing error: ${nonStreamError}`,
        };
      }
    }
  } catch (error) {
    debugLog(`外层请求处理错误: ${error}`);
    console.error('Error stack:', error);

    // 只有在响应还没有开始时才设置错误响应
    if (!ctx.response.body) {
      ctx.response.status = 500;
      ctx.response.body = { error: `Internal server error: ${error}` };
    } else {
      debugLog('响应已开始，无法设置错误状态');
    }
  }
});
