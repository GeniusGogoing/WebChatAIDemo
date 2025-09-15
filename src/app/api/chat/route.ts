import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from '@langchain/core/messages';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { createTextStreamResponse } from 'ai';

import type { ChatRequest } from '../../../types';
import prisma from '../../../lib/prisma';
import { requireUser } from '@/lib/auth';
import { searchTool, currentTimeTool, docsSearchTool, structuredExtractTool } from '../../../lib/tools'; // 导入我们创建的工具

// 移除 Edge Runtime 配置，因为 Prisma 需要 Node.js 运行时
// export const runtime = 'edge';

// GET function to fetch chat history (no changes here)
export async function GET(req: NextRequest) {
  try {
    const chatId = req.nextUrl.searchParams.get('chatId');
    const user = await requireUser();
    if (!chatId) {
      // 返回当前用户最新会话；未登录则返回空
      if (!user) return NextResponse.json({ messages: [] });
      const latestChat = await prisma.chatSession.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      return NextResponse.json(latestChat || { messages: [] });
    }
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: chatId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }
    if (user && chatSession.userId && chatSession.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(chatSession);
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
  }
}

// POST function to handle chat requests
export async function POST(req: Request): Promise<Response> {
  try {
    const { messages, chatId: existingChatId }: ChatRequest = await req.json();

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return new Response('GOOGLE_API_KEY 环境变量未设置', { status: 500 });
    }

    const userMessage = messages[messages.length - 1];
    
    // 检查用户消息是否存在
    if (!userMessage) {
      return new Response('没有找到用户消息', { status: 400 });
    }
    
    const userMessageContent = userMessage.content;
    let currentChatId = existingChatId;

    // 0. 常量：历史压缩策略
    const MAX_RECENT_MESSAGES = 12; // 保留最近的消息条数
    const SUMMARIZE_MIN_TOTAL_CHARS = 8000; // 超过则尝试压缩

    // 1. 组装聊天历史（优先数据库；无 chatId 或尚未写入时使用请求体作为兜底）
    let chatHistory: BaseMessage[] = [];
    if (currentChatId) {
      const chatSession = await prisma.chatSession.findUnique({
        where: { id: currentChatId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (chatSession && chatSession.messages.length > 0) {
        const recentMessages = chatSession.messages.slice(-MAX_RECENT_MESSAGES);
        const mappedRecent = recentMessages.map(m =>
          m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
        );
        chatHistory = chatSession.summary
          ? [new SystemMessage(`以下是该对话的摘要，请结合摘要与后续消息理解上下文：\n${chatSession.summary}`), ...mappedRecent]
          : mappedRecent;
      }
    }
    // 若数据库历史为空，则回退到请求体中的历史（排除本轮最后一条用户消息）
    if (chatHistory.length === 0 && messages.length > 1) {
      const priorMessages = messages.slice(0, -1);
      chatHistory = priorMessages.map(m =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
      );
    }

    // 在流式响应前，若无现有会话则预创建会话，确保响应头能返回 chatId，避免前端反复新建
    const titleFrom = (text: string) => {
      const t = text.trim().replace(/\s+/g, ' ');
      return t.length > 30 ? t.slice(0, 30) + '…' : t || '未命名会话';
    };
    if (!currentChatId) {
      const user = await requireUser();
      const newChat = await prisma.chatSession.create({
        data: { title: titleFrom(userMessageContent), userId: user?.id ?? null },
      });
      currentChatId = newChat.id;
    }


    // 2. 定义 Agent 的核心：模型、提示词和工具
    const model = new ChatGoogleGenerativeAI({ model: "gemini-2.0-flash", apiKey, streaming: true });
    const tools = [searchTool, currentTimeTool, docsSearchTool, structuredExtractTool];
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', "You are a helpful assistant. You may use tools to answer questions."],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);
    
    // 3. 创建 Agent
    const agent = await createToolCallingAgent({
      llm: model,
      tools,
      prompt,
    });

    // 4. 创建 Agent 执行器
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true, // 在控制台打印详细的执行过程
    });

    // 5. 调用 Agent 并获取流式响应
    const stream = await agentExecutor.stream({
      input: userMessageContent,
      chat_history: chatHistory,
    });

    let accumulatedContent = '';
    let finalAnswer = '';
    
    // 创建一个新的 ReadableStream 来处理 Agent 的流
    const transformedStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Agent 的输出有很多种，我们只关心最终的答案 chunk
            if (chunk.output) {
              const content = typeof chunk.output === 'string' ? chunk.output : JSON.stringify(chunk.output);
              accumulatedContent += content;
              controller.enqueue(content);
            }
          }
          
          // 确保 finalAnswer 是累加后的完整内容
          finalAnswer = accumulatedContent;
          controller.close();
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        }
      },
    });
    
    // 6. 将用户消息和最终的 AI 回复保存到数据库
    // 我们将数据库操作移到流结束后，确保数据一致性
    const saveMessages = async () => {
        // 等待流完全结束后再执行
        await new Promise(resolve => {
            const check = () => finalAnswer ? resolve(finalAnswer) : setTimeout(check, 100);
            check();
        });

        // 会话已提前创建，这里仅写入消息并更新会话时间戳
        await prisma.message.createMany({
          data: [
            { chatSessionId: currentChatId as string, role: 'user', content: userMessageContent },
            { chatSessionId: currentChatId as string, role: 'assistant', content: finalAnswer },
          ],
        });
        // 手动触发会话的 updatedAt，以便列表排序最新
        await prisma.chatSession.update({ where: { id: currentChatId as string }, data: { updatedAt: new Date() } });

        // 尝试进行历史压缩（异步）：当总字数较大或消息过多时，将历史总结存入 ChatSession.summary
        try {
          if (!currentChatId) return;
          const full = await prisma.chatSession.findUnique({
            where: { id: currentChatId },
            include: { messages: { orderBy: { createdAt: 'asc' } } },
          });
          if (!full) return;

          const totalChars = full.messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
          const tooManyMessages = full.messages.length > MAX_RECENT_MESSAGES * 2;
          const needSummarize = totalChars >= SUMMARIZE_MIN_TOTAL_CHARS || tooManyMessages;
          if (!needSummarize) return;

          // 仅摘要较早的消息，保留最近一段原文
          const older = full.messages.slice(0, Math.max(0, full.messages.length - MAX_RECENT_MESSAGES));
          if (older.length === 0) return;

          const historyText = older
            .map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
            .join('\n');

          const instruction = `请将以下对话内容进行中文摘要，保留关键事实、指令、偏好与已给出的结论；避免冗长，尽量控制在 200-300 字以内。`;
          const summaryResult = await model.invoke([
            new SystemMessage('你是对话摘要助手。输出简洁的要点摘要，不要添加无关内容。'),
            new HumanMessage(`${instruction}\n\n对话内容如下：\n${historyText}`),
          ]);
          const summaryText = typeof summaryResult.content === 'string'
            ? summaryResult.content
            : Array.isArray((summaryResult as any).content)
              ? (summaryResult as any).content.map((c: any) => c.text || '').join('')
              : JSON.stringify((summaryResult as any).content);

          await prisma.chatSession.update({
            where: { id: currentChatId },
            data: { summary: summaryText },
          });
        } catch (e) {
          console.error('对话历史摘要失败:', e);
        }
    };
    
    // 异步执行保存操作，不阻塞响应返回
    saveMessages().catch(console.error);

    // 7. 返回流式响应
    return createTextStreamResponse({
      textStream: transformedStream,
      headers: { 'X-Chat-Id': currentChatId || '' },
    });

  } catch (error: unknown) {
    console.error('API 错误详情:', error);
    return new Response(JSON.stringify({ error: 'API 请求失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}