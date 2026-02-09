import React from 'react';

export const formatWorkshopMessage = (text: string): JSX.Element => {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];

  const processLine = (line: string, index: number) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      elements.push(<div key={`space-${index}`} className="h-2" />);
      return;
    }

    if (trimmedLine.startsWith('>')) {
      const content = trimmedLine.substring(1).trim();
      elements.push(
        <div key={index} className="mb-3 ml-4 pl-4 border-l-2 border-cyan-500/50 bg-gray-700/30 py-2 pr-3 rounded-r">
          <span className="text-gray-200 leading-relaxed">{processInlineFormatting(content)}</span>
        </div>
      );
      return;
    }

    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2].trim();
      const sizes = ['text-xl', 'text-lg', 'text-base', 'text-base', 'text-sm', 'text-sm'];
      const marginTop = level === 1 ? 'mt-4' : level === 2 ? 'mt-3' : 'mt-2';

      elements.push(
        <div key={index} className={`${sizes[level - 1]} font-bold text-cyan-300 ${marginTop} mb-2`}>
          {content}
        </div>
      );
      return;
    }

    const numberedListMatch = trimmedLine.match(/^(\d+)\.\s*\*\*(.*?)\*\*[:\s]*(.*)$/);
    if (numberedListMatch) {
      const [, number, title, content] = numberedListMatch;
      elements.push(
        <div key={index} className="mb-3 ml-4">
          <div className="flex items-start space-x-2">
            <span className="text-cyan-400 font-semibold">{number}.</span>
            <div className="flex-1">
              <span className="font-semibold text-cyan-300">{title}</span>
              {content && <span className="text-gray-200">: {content}</span>}
            </div>
          </div>
        </div>
      );
      return;
    }

    const simpleNumberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (simpleNumberedMatch) {
      const [, number, content] = simpleNumberedMatch;
      elements.push(
        <div key={index} className="mb-2 ml-4 flex items-start space-x-2">
          <span className="text-cyan-400 font-semibold">{number}.</span>
          <span className="text-gray-200 flex-1">{processInlineFormatting(content)}</span>
        </div>
      );
      return;
    }

    if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
      const content = trimmedLine.substring(1).trim();
      if (content && !trimmedLine.startsWith('**')) {
        elements.push(
          <div key={index} className="flex items-start space-x-2 mb-2 ml-4">
            <span className="text-cyan-400 mt-0.5">•</span>
            <span className="text-gray-200 flex-1">{processInlineFormatting(content)}</span>
          </div>
        );
        return;
      }
    }

    elements.push(
      <div key={index} className="mb-2 text-gray-200 leading-relaxed">
        {processInlineFormatting(trimmedLine)}
      </div>
    );
  };

  const processInlineFormatting = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index} className="font-semibold text-cyan-300">{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  lines.forEach(processLine);

  return <div className="space-y-0.5">{elements}</div>;
};
