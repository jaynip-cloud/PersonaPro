import { useEffect, useState } from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    const renderMarkdown = async () => {
      try {
        marked.setOptions({
          gfm: true,
          breaks: true,
        });

        const rendered = await marked.parse(content);
        setHtml(rendered);
      } catch (error) {
        console.error('Error rendering markdown:', error);
        setHtml(content);
      }
    };

    renderMarkdown();
  }, [content]);

  return (
    <div
      className={`markdown-content prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
