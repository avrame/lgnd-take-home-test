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
  private transport: StreamableHTTPClientTransport | null = null;
  public tools: ToolUnion[] = [];
  private messages: MessageParam[] = [];

  constructor() {
    this.anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
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

  async processQuery(query: string) {
    this.messages.push(
      {
        role: 'user',
        content: query,
      },
    );

    const response = await this.anthropic.messages.create({
      max_tokens: 1000,
      model: 'claude-haiku-4-5-20251001',
      messages: this.messages,
      tools: this.tools,
    });

    const finalText: string[] = [];
    let structuredContent: any = null;

    for (const content of response.content) {
      if (content.type === "text") {
        finalText.push(content.text);
      } else if (content.type === 'tool_use') {
        const toolName = content.name;
        const toolArgs = content.input as { [x: string]: unknown } | undefined;

        const result = await this.mcp.callTool({
          name: toolName,
          arguments: toolArgs,
        });
        structuredContent = result.structuredContent;
        console.log('Calling tool', toolName, 'with args', toolArgs);

        this.messages.push({
          role: "user",
          content: result.content as string,
        });

        const response = await this.anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: this.messages,
        });

        finalText.push(
          response.content[0].type === "text" ? response.content[0].text : ""
        );
      }
    }

    console.log('structuredContent:', structuredContent);

    return {
      text: finalText.join("\n"),
      structuredContent,
    }
  }
}