import { z } from 'zod';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export function buildModel(apiKey = process.env.GOOGLE_API_KEY) {
  if (!apiKey) throw new Error('GOOGLE_API_KEY 未设置');
  return new ChatGoogleGenerativeAI({ model: DEFAULT_MODEL, apiKey, streaming: false });
}

export async function extractWithZodSchema<T>(
  text: string,
  schema: z.ZodType<T>,
  systemPrompt = '你是信息抽取助手，请严格输出与给定模式匹配的 JSON，勿添加无关字段。'
): Promise<T> {
  const model = buildModel();
  const structured = model.withStructuredOutput(schema);
  // 直接对输入文本进行抽取；可加上系统提示以获得更稳定输出
  const result = await structured.invoke(`${systemPrompt}\n\n文本：\n${text}`);
  return result as T;
}

// 内置示例 Schema，便于 API 与工具快速演示
export const ContactInfoSchema = z.object({
  name: z.string().describe('姓名，若未知填空字符串'),
  email: z.string().email().or(z.literal('')).describe('邮箱地址，若无则为空'),
  phone: z.string().describe('电话，原样提取；若无则为空'),
});

export type ContactInfo = z.infer<typeof ContactInfoSchema>;

export const TaskItemSchema = z.object({
  title: z.string().describe('任务标题的简短总结'),
  dueDate: z.string().describe('到期日期 ISO 字符串，若无则为空字符串'),
  priority: z.enum(['low', 'medium', 'high']).describe('优先级估计'),
});

export type TaskItem = z.infer<typeof TaskItemSchema>;

export function getBuiltinSchema(name: string): z.ZodTypeAny | null {
  switch (name) {
    case 'contact':
      return ContactInfoSchema;
    case 'task':
      return TaskItemSchema;
    default:
      return null;
  }
}


