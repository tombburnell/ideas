"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownBodyProps {
  markdown: string;
  className?: string;
}

export const MarkdownBody = ({ markdown, className = "" }: MarkdownBodyProps): React.ReactElement => (
  <div className={`prose prose-invert prose-zinc max-w-none text-sm ${className}`}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
  </div>
);
