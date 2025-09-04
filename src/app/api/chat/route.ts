import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { createTextStreamResponse } from 'ai';
import type { ApiMessage, ChatRequest, ChatResponse } from '../../../types';

export const runtime = 'edge';

export async function POST(req: Request): Promise<Response> {
    try {
        const { messages }: ChatRequest = await req.json();
        
        // 检查环境变量
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error('GOOGLE_API_KEY 环境变量未设置');
            return new Response('GOOGLE_API_KEY 环境变量未设置', { status: 500 });
        }
        
        console.log('API Key 存在:', apiKey ? '是' : '否');
        console.log('收到消息数量:', messages?.length || 0);
        
        const model = new ChatGoogleGenerativeAI({
            model : "gemini-2.0-flash",
            apiKey : apiKey,
            streaming : true,
        });
        
        const langChainMessages: BaseMessage[] = messages.map(
            (message: ApiMessage): BaseMessage => {
                if (message.role === "user") {
                    return new HumanMessage(message.content);
                } else {
                    return new AIMessage(message.content);
                }
            }
        );

        console.log('LangChain 消息转换完成，数量:', langChainMessages.length);
        
        const response = await model.invoke(langChainMessages);
        console.log('模型响应类型:', typeof response.content);
        
        // 处理 MessageContent 类型
        let content = '';
        if (typeof response.content === 'string') {
            content = response.content;
        } else if (Array.isArray(response.content)) {
            content = response.content.map(item => 
                typeof item === 'string' ? item : JSON.stringify(item)
            ).join('');
        } else {
            content = JSON.stringify(response.content);
        }
        
        console.log('处理后的内容长度:', content.length);
        
        // 创建真正的流式响应，智能控制发送速度
        const textStream = new ReadableStream({
            start(controller) {
                // 智能速度控制：根据数据量调整发送间隔
                const chars = content.split('');
                const totalChars = chars.length;
                let index = 0;
                
                // 计算基础发送间隔（毫秒）
                let baseDelay = 50; // 默认50ms
                
                // 根据内容长度动态调整速度
                if (totalChars > 100) {
                    baseDelay = 30; // 长文本加快
                }
                if (totalChars > 200) {
                    baseDelay = 20; // 更长文本更快
                }
                if (totalChars > 500) {
                    baseDelay = 10; // 超长文本最快
                }
                
                console.log(`总字符数: ${totalChars}, 基础延迟: ${baseDelay}ms`);
                
                const sendNextChar = () => {
                    if (index < chars.length) {
                        // 直接发送文本字符
                        const char = chars[index];
                        controller.enqueue(char);
                        index++;
                        
                        // 动态调整延迟：越接近结尾发送越快
                        let currentDelay = baseDelay;
                        const progress = index / totalChars;
                        
                        if (progress > 0.8) {
                            currentDelay = Math.max(5, baseDelay * 0.5); // 最后20%加快
                        } else if (progress > 0.5) {
                            currentDelay = Math.max(10, baseDelay * 0.7); // 后半段稍快
                        }
                        
                        // 添加随机性，让发送更自然
                        const randomDelay = currentDelay + Math.random() * 10 - 5;
                        const finalDelay = Math.max(5, randomDelay);
                        
                        setTimeout(sendNextChar, finalDelay);
                    } else {
                        controller.close();
                    }
                };
                
                sendNextChar();
            }
        });
        
        return createTextStreamResponse({ textStream });
        
    } catch (error: unknown) {
        console.error('API 错误详情:', error);
        
        const errorResponse: ChatResponse = {
            error: 'API 请求失败',
            details: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        };
        
        return new Response(
            JSON.stringify(errorResponse), 
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}