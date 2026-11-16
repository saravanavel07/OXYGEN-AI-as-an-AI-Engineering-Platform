import React, { useMemo, useState } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const html = useMemo(() => {
    const renderer = new marked.Renderer();
    renderer.code = ({ text, lang }) => {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted =
        language !== 'plaintext'
          ? hljs.highlight(text, { language }).value
          : hljs.highlightAuto(text).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    };
    return marked.parse(content || '', { renderer, breaks: true, gfm: true }) as string;
  }, [content]);

  return (
    <div
      className={`oxygen-prose text-sm text-[#E5E5E5] ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'python', title }) => {
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    const validLang = hljs.getLanguage(language) ? language : 'plaintext';
    if (validLang === 'plaintext') {
      return hljs.highlightAuto(code).value;
    }
    return hljs.highlight(code, { language: validLang }).value;
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-lg border border-white/10 bg-[#0B0B0B] overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#121212] px-3.5 py-2">
        <div className="flex items-center gap-2 text-xs text-[#969696]">
          <span className="font-mono text-[#B8B8B8]">{title || language}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">{code.split('\n').length} lines</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[#B8B8B8] hover:bg-white/5 hover:text-[#F5F5F5] transition-colors whitespace-nowrap shrink-0"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#E32636]" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs leading-relaxed">
        <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
};
