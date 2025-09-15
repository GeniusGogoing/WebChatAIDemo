import { TavilySearch } from "@langchain/tavily";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { searchKnowledgeBase } from "@/lib/rag";
import { extractWithZodSchema, ContactInfoSchema } from "@/lib/structured";

// 创建一个 Tavily 搜索工具的实例
// maxResults 指定了每次搜索最多返回几条结果
const createSearchTool = () => {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY 环境变量未设置');
  }
  
  return new TavilySearch({ 
    maxResults: 3,
    tavilyApiKey: apiKey
  });
};

// 备用搜索工具（如果 Tavily 不可用）
const createWebSearchTool = () => {
  return new DynamicStructuredTool({
    name: "web_search",
    description: "搜索网络获取最新信息",
    schema: z.object({
      query: z.string().describe("搜索查询"),
    }),
    func: async ({ query }) => {
        console.log("using other web search");
      // 这里可以实现其他搜索服务，如 SerpAPI、Google Custom Search 等
      return `搜索结果: ${query}`;
    }
  });
};

// 导出工具实例（如果 API Key 可用）
export const searchTool = process.env.TAVILY_API_KEY 
  ? createSearchTool() 
  : createWebSearchTool();

// 导出工具创建函数，用于动态创建
export { createSearchTool, createWebSearchTool };

// 当前时间工具（用于回答日期/时间/星期几等无需联网的问题）
export const currentTimeTool = new DynamicStructuredTool({
  name: "current_time",
  description:
    "获取当前的日期与时间信息；当用户询问今天日期、星期几、现在几点、当前时间等时使用此工具，不需要联网。",
  schema: z.object({
    locale: z
      .string()
      .describe("可选，语言与地区标识，如 zh-CN、en-US，用于格式化输出")
      .optional(),
    timeZone: z
      .string()
      .describe(
        "可选，IANA 时区名称，如 Asia/Shanghai；不传则使用服务器默认时区"
      )
      .optional(),
  }),
  func: async ({ locale, timeZone }) => {
    try {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        weekday: "long",
        hour12: false,
        timeZone,
      };
      const usedLocale = locale || "zh-CN";
      const fmt = new Intl.DateTimeFormat(usedLocale, options);
      const formatted = fmt.format(now);
      const weekday = new Intl.DateTimeFormat(usedLocale, { weekday: "long", timeZone }).format(now);

      return JSON.stringify({
        iso: now.toISOString(),
        locale: usedLocale,
        timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        formatted,
        weekday,
        timestamp: now.getTime(),
      });
    } catch (e) {
      return `无法获取当前时间: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});

// 文档检索工具（RAG）
export const docsSearchTool = new DynamicStructuredTool({
  name: "project_docs_search",
  description: "检索项目内文档（README、Design/* 等）的相关内容，用于回答与本项目相关的问题。",
  schema: z.object({
    query: z.string().describe("查询文本"),
    topK: z.number().int().min(1).max(10).optional().describe("返回条数，默认 5"),
  }),
  func: async ({ query, topK }) => {
    const k = topK ?? 5;
    const results = await searchKnowledgeBase('project-docs', query, k);
    if (results.length === 0) return '未检索到相关内容';
    return results
      .map((r, i) => `#${i + 1} [${r.source}#${r.ord}] (score=${r.score.toFixed(3)})\n${r.content}`)
      .join('\n\n---\n\n');
  },
});

// 结构化信息抽取工具
export const structuredExtractTool = new DynamicStructuredTool({
  name: "structured_extract",
  description: "从文本中抽取结构化字段（如姓名、邮箱、电话），用于信息抽取和表单填充。",
  schema: z.object({
    text: z.string().describe("要抽取的原始文本"),
  }),
  func: async ({ text }) => {
    const data = await extractWithZodSchema(text, ContactInfoSchema);
    return JSON.stringify(data);
  },
});