/**
 * Basic functionality tests
 */

import { assertEquals, assertExists } from "std/assert/mod.ts";
import { config } from "../app/core/config.ts";

Deno.test("Config loading", () => {
  assertExists(config.API_ENDPOINT);
  assertExists(config.AUTH_TOKEN);
  assertEquals(config.LISTEN_PORT, 8080);
});

Deno.test("Model configuration", () => {
  assertEquals(config.PRIMARY_MODEL, "GLM-4.5");
  assertEquals(config.THINKING_MODEL, "GLM-4.5-Thinking");
  assertEquals(config.SEARCH_MODEL, "GLM-4.5-Search");
  assertEquals(config.AIR_MODEL, "GLM-4.5-Air");
});

Deno.test("Feature flags", () => {
  assertEquals(typeof config.DEBUG_LOGGING, "boolean");
  assertEquals(typeof config.ANONYMOUS_MODE, "boolean");
  assertEquals(typeof config.TOOL_SUPPORT, "boolean");
  assertEquals(typeof config.SKIP_AUTH_TOKEN, "boolean");
});
