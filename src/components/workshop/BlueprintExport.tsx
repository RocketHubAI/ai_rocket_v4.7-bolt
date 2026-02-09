import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  MessageSquare,
  Zap,
  Code2,
  ExternalLink
} from 'lucide-react';

interface Blueprint {
  id: string;
  blueprintTitle: string;
  markdownContent: string;
  claudeOptimized: string | null;
  chatgptOptimized: string | null;
  quickStartPrompt: string | null;
  dataSources: string[];
  status: string;
}

interface BlueprintExportProps {
  blueprint: Blueprint;
  prototypeTitle: string;
  onClose: () => void;
}

type ExportFormat = 'full' | 'claude' | 'chatgpt' | 'prompt';

export const BlueprintExport: React.FC<BlueprintExportProps> = ({
  blueprint,
  prototypeTitle,
  onClose
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('full');
  const [copied, setCopied] = useState(false);

  const formats: { id: ExportFormat; label: string; description: string; icon: React.ComponentType<any>; disabled?: boolean }[] = [
    {
      id: 'full',
      label: 'Full Blueprint',
      description: 'Complete guide with all build options',
      icon: FileText
    },
    {
      id: 'claude',
      label: 'Claude-Ready',
      description: 'Optimized for Claude Code & Projects',
      icon: Code2,
      disabled: !blueprint.claudeOptimized
    },
    {
      id: 'chatgpt',
      label: 'ChatGPT-Ready',
      description: 'Formatted for Custom GPT creation',
      icon: MessageSquare,
      disabled: !blueprint.chatgptOptimized
    },
    {
      id: 'prompt',
      label: 'Quick Start Prompt',
      description: 'Just the AI prompt for any assistant',
      icon: Zap,
      disabled: !blueprint.quickStartPrompt
    }
  ];

  const getContent = (): string => {
    switch (selectedFormat) {
      case 'claude':
        return blueprint.claudeOptimized || blueprint.markdownContent;
      case 'chatgpt':
        return blueprint.chatgptOptimized || blueprint.markdownContent;
      case 'prompt':
        return blueprint.quickStartPrompt || '';
      default:
        return blueprint.markdownContent;
    }
  };

  const getFilename = (): string => {
    const sanitizedTitle = prototypeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    switch (selectedFormat) {
      case 'claude':
        return `${sanitizedTitle}-claude.md`;
      case 'chatgpt':
        return `${sanitizedTitle}-chatgpt.md`;
      case 'prompt':
        return `${sanitizedTitle}-prompt.txt`;
      default:
        return `${sanitizedTitle}-blueprint.md`;
    }
  };

  const handleDownload = () => {
    const content = getContent();
    const mimeType = selectedFormat === 'prompt' ? 'text/plain' : 'text/markdown';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const content = getContent();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Export Blueprint</h2>
            <p className="text-sm text-gray-400">{prototypeTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              Choose Export Format
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {formats.map(format => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.id}
                    onClick={() => !format.disabled && setSelectedFormat(format.id)}
                    disabled={format.disabled}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                      selectedFormat === format.id
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : format.disabled
                          ? 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedFormat === format.id
                        ? 'bg-cyan-500/20'
                        : 'bg-gray-700'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        selectedFormat === format.id ? 'text-cyan-400' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <p className={`font-medium ${
                        selectedFormat === format.id ? 'text-white' : 'text-gray-300'
                      }`}>
                        {format.label}
                      </p>
                      <p className="text-sm text-gray-500">{format.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              Preview
            </h3>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {getContent().substring(0, 1000)}
                {getContent().length > 1000 && '...'}
              </pre>
            </div>
          </div>

          {blueprint.dataSources.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                Required Data Sources
              </h3>
              <div className="flex flex-wrap gap-2">
                {blueprint.dataSources.map((source, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-amber-500/10 text-amber-400 text-sm rounded-full"
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
            <h3 className="text-cyan-400 font-medium mb-2">How to Use This Blueprint</h3>
            <ol className="text-sm text-gray-300 space-y-2">
              <li className="flex gap-2">
                <span className="text-cyan-400 font-mono">1.</span>
                Download or copy the blueprint content
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-mono">2.</span>
                Open your preferred AI assistant (Claude, ChatGPT, Gemini, Grok)
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-mono">3.</span>
                Paste the blueprint and ask the AI to help you build it
              </li>
              <li className="flex gap-2">
                <span className="text-cyan-400 font-mono">4.</span>
                Follow the step-by-step instructions in the blueprint
              </li>
            </ol>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2">
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
            >
              Claude <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-gray-600">|</span>
            <a
              href="https://chat.openai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
            >
              ChatGPT <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-gray-600">|</span>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
            >
              Gemini <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
