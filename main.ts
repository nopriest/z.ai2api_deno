/**
 * Main application entry point
 */

import { Application, Router } from "oak/mod.ts";
import { CORS } from "oak/cors.ts";
import { config } from "./app/core/config.ts";
import { openaiRouter } from "./app/core/openai.ts";

// Create Oak application
const app = new Application();

// Add CORS middleware
app.use(CORS({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  headers: ["Content-Type", "Authorization"],
}));

// Create main router
const router = new Router();

// Include OpenAI API routes
router.use("/v1", openaiRouter.routes());
router.use("/v1", openaiRouter.allowedMethods());

// Root endpoint
router.get("/", (ctx) => {
  ctx.response.body = { message: "OpenAI Compatible API Server" };
});

// Handle OPTIONS requests
router.options("/", (ctx) => {
  ctx.response.status = 200;
});

// Use router
app.use(router.routes());
app.use(router.allowedMethods());

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Unhandled error:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Start server
const port = config.LISTEN_PORT;
console.log(`🚀 Server starting on http://0.0.0.0:${port}`);
console.log(`📖 API docs available at http://localhost:${port}/v1/models`);

await app.listen({ port });
