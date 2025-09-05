import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { createTextStreamResponse } from 'ai';
import type { ApiMessage, ChatRequest } from '../../../types';
import prisma from '../../../lib/prisma'; // 导入我们的 Prisma Client

// 移除 Edge Runtime 配置，因为 Prisma 需要 Node.js 运行时
// export const runtime = 'edge';

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
    
    let currentChatId = existingChatId;
    let chatHistory: ApiMessage[] = [];

    // 如果是新对话，创建 ChatSession 并保存第一条消息
    if (!currentChatId) {
      const newChat = await prisma.chatSession.create({
        data: {
          messages: {
            create: {
              role: userMessage.role,
              content: userMessage.content,
            },
          },
        },
        include: {
          messages: true, // 返回创建的消息
        },
      });
      currentChatId = newChat.id;
      chatHistory = newChat.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    } else {
      // 如果是现有对话，保存新消息并加载历史记录
      await prisma.message.create({
        data: {
          chatSessionId: currentChatId,
          role: userMessage.role,
          content: userMessage.content,
        },
      });
      const allMessages = await prisma.message.findMany({
        where: { chatSessionId: currentChatId },
        orderBy: { createdAt: 'asc' },
      });
      chatHistory = allMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    }

    // 初始化模型
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      apiKey: apiKey,
      streaming: true,
    });

    const langChainMessages: BaseMessage[] = chatHistory.map((message) =>
      message.role === "user"
        ? new HumanMessage(message.content)
        : new AIMessage(message.content)
    );

    // 调用模型并获取流
    const stream = await model.stream(langChainMessages);
    
    let accumulatedContent = '';
    
    // 创建一个新的 ReadableStream 来处理 LangChain 的流
    const transformedStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = typeof chunk.content === 'string' ? chunk.content : '';
            accumulatedContent += content;
            controller.enqueue(content);
          }
          
          // 对话结束后，将完整的 AI 回复保存到数据库
          if (currentChatId) {
            await prisma.message.create({
              data: {
                chatSessionId: currentChatId,
                role: 'assistant',
                content: accumulatedContent,
              },
            });
          }
          
          controller.close();
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        }
      },
    });
    
    // 使用 Vercel AI SDK 的 createTextStreamResponse 返回响应
    return createTextStreamResponse({
        textStream: transformedStream,
        headers: {
            'X-Chat-Id': currentChatId, // 在响应头中返回 chatId
        },
    });

  } catch (error: unknown) {
    console.error('API 错误详情:', error);
    
    // 提供更详细的错误信息用于调试
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('错误消息:', errorMessage);
    console.error('错误堆栈:', errorStack);
    
    return new Response(JSON.stringify({ 
      error: 'API 请求失败',
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}