import React from 'react';

export const formatAstraMessage = (text: string): JSX.Element => {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  const isTableRow = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed.includes('|')) return false;
    const pipeCount = (trimmed.match(/\|/g) || []).length;
    if (pipeCount < 2) return false;
    const startsWithPipe = trimmed.startsWith('|');
    const endsWithPipe = trimmed.endsWith('|');
    if (startsWithPipe && endsWithPipe) return true;
    const isSeparator = /^\|?[\s\-:|]+\|?$/.test(trimmed);
    if (isSeparator) return true;
    if (inTable && pipeCount >= 2) return true;
    return false;
  };

  const processLine = (line: string, index: number) => {
    let trimmedLine = line.trim();

    trimmedLine = trimmedLine.replace(/\(Chunks?[^)]+\)/gi, '').trim();

    if (/^[-_*]{3,}$/.test(trimmedLine)) {
      return;
    }

    if (isTableRow(trimmedLine)) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(trimmedLine);
      return;
    } else if (inTable) {
      elements.push(renderTable(tableRows, `table-${index}`));
      inTable = false;
      tableRows = [];
    }

    if (!trimmedLine) {
      elements.push(<div key={`space-${index}`} className="h-3" />);
      return;
    }

    if (trimmedLine.startsWith('>')) {
      const content = trimmedLine.substring(1).trim();
      elements.push(
        <div key={index} className="mb-3 ml-4 pl-4 border-l-2 border-blue-500/50 bg-slate-800/30 py-2 pr-3 rounded-r">
          <span className="text-gray-300 leading-relaxed">{processInlineFormatting(content)}</span>
        </div>
      );
      return;
    }

    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2].trim();
      const sizes = ['text-xl', 'text-lg', 'text-base', 'text-base', 'text-sm', 'text-sm'];
      const marginTop = level === 1 ? 'mt-6' : level === 2 ? 'mt-5' : 'mt-4';

      elements.push(
        <div key={index} className={`${sizes[level - 1]} font-bold text-blue-300 ${marginTop} mb-2`}>
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
            <span className="text-blue-400 font-semibold">{number}.</span>
            <div className="flex-1">
              <span className="font-semibold text-blue-300">{title}</span>
              {content && <span className="text-gray-300">: {content}</span>}
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
          <span className="text-blue-400 font-semibold">{number}.</span>
          <span className="text-gray-300 flex-1">{processInlineFormatting(content)}</span>
        </div>
      );
      return;
    }

    if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
      const content = trimmedLine.substring(1).trim();
      elements.push(
        <div key={index} className="flex items-start space-x-2 mb-2 ml-4">
          <span className="text-blue-400 mt-1">•</span>
          <span className="text-gray-300 flex-1">{processInlineFormatting(content)}</span>
        </div>
      );
      return;
    }

    if (trimmedLine.startsWith('*') && !trimmedLine.startsWith('**')) {
      const content = trimmedLine.substring(1).trim();
      elements.push(
        <div key={index} className="flex items-start space-x-2 mb-2 ml-4">
          <span className="text-blue-400 mt-1">•</span>
          <span className="text-gray-300 flex-1">{processInlineFormatting(content)}</span>
        </div>
      );
      return;
    }

    elements.push(
      <div key={index} className="mb-2 text-gray-300 leading-relaxed">
        {processInlineFormatting(trimmedLine)}
      </div>
    );
  };

  const processInlineFormatting = (text: string): React.ReactNode => {
    // Handle bold text (**text**)
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index} className="font-semibold text-blue-300">{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderTable = (rows: string[], key: string): JSX.Element => {
    if (rows.length < 2) return <></>;

    const parseRow = (row: string) =>
      row.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);

    const headers = parseRow(rows[0]);
    const dataRows = rows.slice(2).map(parseRow); // Skip separator row

    return (
      <div key={key} className="my-4 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-600">
              {headers.map((header, i) => (
                <th key={i} className="text-left py-2 px-3 text-blue-300 font-semibold text-sm">
                  {header.replace(/\*\*/g, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, i) => (
              <tr key={i} className="border-b border-gray-700/50">
                {row.map((cell, j) => (
                  <td key={j} className="py-2 px-3 text-gray-300 text-sm">
                    {processInlineFormatting(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  lines.forEach(processLine);

  // Handle any remaining table
  if (inTable && tableRows.length > 0) {
    elements.push(renderTable(tableRows, 'table-final'));
  }

  return <div className="space-y-1">{elements}</div>;
};
