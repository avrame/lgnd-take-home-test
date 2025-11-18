import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import Anthropic from '@anthropic-ai/sdk';
import { MessageParam, ToolUnion } from "@anthropic-ai/sdk/resources";
import dotenv from "dotenv";

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

export default class MCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private model: string;
  private transport: StreamableHTTPClientTransport | null = null;
  public tools: ToolUnion[] = [];
  private messages: MessageParam[] = [];

  constructor() {
    this.anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    this.model = 'claude-haiku-4-5-20251001';
    this.mcp = new Client({
      name: 'mcp-client',
      version: '1.0.0',
    });
  }

  async connect(serverUrl: string) {
    try {
      const url = new URL(serverUrl);
      this.transport = new StreamableHTTPClientTransport(url);
      await this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }))
      console.log("Connected to MCP server with tools:", this.tools.map(tool => tool.name));
    } catch (e) {
      console.error("Failed to connect to MCP server:", e);
      throw e;
    }
  }

  async processQuery(query: string, ws: any) {
    this.messages.push(
      {
        role: 'user',
        content: query,
      },
    );

    const query_response = await this.anthropic.messages.create({
      max_tokens: 1000,
      model: this.model,
      messages: this.messages,
      tools: this.tools,
    });

    this.messages.push({
      role: "assistant",
      content: query_response.content,
    });

    let structuredContent: any[] = [];

    for (const content of query_response.content) {
      if (content.type === "text") {
        ws.send(JSON.stringify({ response: content.text, structuredContent: null }));
      } else if (content.type === 'tool_use') {
        const toolName = content.name;
        const toolArgs = content.input as { [x: string]: unknown } | undefined;

        const result = await this.mcp.callTool({
          name: toolName,
          arguments: toolArgs,
        });
        console.log('Calling tool', toolName, 'with args', toolArgs);
        console.log('result:', JSON.stringify(result, null, 2));
        structuredContent = structuredContent.concat((result.structuredContent as any).features);

        this.messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: content.id,
              content: result.content as string,
            }
          ],
        });
        console.log('this.messages:', JSON.stringify(this.messages, null, 2));
      }
    }

    const tool_use_response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 1000,
      messages: this.messages,
    });

    console.log('response.content after tool use:', JSON.stringify(tool_use_response.content, null, 2));

    this.messages.push({
      role: "assistant",
      content: tool_use_response.content[0].type === "text" ? tool_use_response.content[0].text : "",
    });

    console.log('this.messages after tool use:', JSON.stringify(this.messages, null, 2));

    ws.send(JSON.stringify({
      response: tool_use_response.content[0].type === "text" ? tool_use_response.content[0].text : "",
      structuredContent,
    }));
  }
}