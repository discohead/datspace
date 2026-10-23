import { API_VERSION, callTool, tools } from "@datspace/contract";
import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { source } from "./env.ts";
import { deliver } from "./transmit.ts";
import { logCall } from "./log.ts";

const HOSTNAMES = ["datspace.ai", "datspace-ai.datspace-web.workers.dev", "localhost", "127.0.0.1"];

/**
 * A stateless MCP server: a fresh server per request, no sessions. Every tool
 * is the contract's definition, so MCP, JSON, and the CLI can't drift apart.
 */
export function handleMcp(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const handler = createMcpHandler(() => createServer(env, ctx, request), {
    route: "/mcp",
    allowedHostnames: HOSTNAMES,
    allowedOriginHostnames: [...HOSTNAMES, "datspace.io"],
  });
  return handler(request, env, ctx);
}

function createServer(env: Env, ctx: ExecutionContext, request: Request): McpServer {
  const server = new McpServer({ name: "datspace", version: API_VERSION });
  const network = source(env, (message) => deliver(env, ctx, request, "mcp", message));
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        outputSchema: tool.output,
        annotations: tool.readOnly
          ? { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
          : { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
      },
      async (input: unknown): Promise<CallToolResult> => {
        logCall(env, ctx, "mcp", tool.name);
        const result = await callTool(tool.name, network, input);
        if (!result.ok) {
          return {
            isError: true,
            content: [{ type: "text", text: JSON.stringify({ apiVersion: API_VERSION, error: result.error }) }],
          };
        }
        const data = result.data as Record<string, unknown>;
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
        };
      },
    );
  }
  return server;
}
