import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { MarkdownRendererProps } from '../types';
import 'highlight.js/styles/github.css'; // 代码高亮样式

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none prose-gray">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 自定义代码块样式
          code(props: any) {
            const { node, inline, className, children, ...restProps } = props;
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-sm">
                <code className={className} {...restProps}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono" {...restProps}>
                {children}
              </code>
            );
          },
          // 自定义段落样式
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>;
          },
          // 自定义列表样式
          ul({ children }) {
            return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
          },
          // 自定义链接样式
          a({ children, href }) {
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {children}
              </a>
            );
          },
          // 自定义标题样式
          h1({ children }) {
            return <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-bold mb-2 mt-2 first:mt-0">{children}</h3>;
          },
          // 自定义引用样式
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">
                {children}
              </blockquote>
            );
          },
          // 自定义表格样式
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2">
                <table className="min-w-full border-collapse border border-gray-300">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-left">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-gray-300 px-2 py-1">
                {children}
              </td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
