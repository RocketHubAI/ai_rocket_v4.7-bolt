import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { helpFAQ, faqCategories, FAQItem } from '../data/helpFAQ';

interface FAQSectionProps {
  isAdmin: boolean;
}

export function FAQSection({ isAdmin }: FAQSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const filteredFAQ = helpFAQ.filter(item => {
    if (!isAdmin && item.category === 'admin') return false;

    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      item.question.toLowerCase().includes(query) ||
      item.answer.toLowerCase().includes(query)
    );
  });

  const groupedFAQ = filteredFAQ.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  const toggleQuestion = (question: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(question)) {
      newExpanded.delete(question);
    } else {
      newExpanded.add(question);
    }
    setExpandedQuestions(newExpanded);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-3 border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors"
        />
      </div>

      {Object.keys(groupedFAQ).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No questions found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFAQ).map(([category, items]) => {
            const categoryInfo = faqCategories[category as keyof typeof faqCategories];
            return (
              <div key={category}>
                <h3 className="text-lg font-semibold text-white mb-3">
                  {categoryInfo.title}
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  {categoryInfo.description}
                </p>
                <div className="space-y-2">
                  {items.map((item, index) => {
                    const questionId = `${category}-${index}`;
                    const isExpanded = expandedQuestions.has(questionId);

                    return (
                      <div
                        key={questionId}
                        className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden transition-all"
                      >
                        <button
                          onClick={() => toggleQuestion(questionId)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800 transition-colors"
                        >
                          <span className="text-white font-medium pr-4">
                            {item.question}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                              isExpanded ? 'transform rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="px-4 py-3 bg-gray-900/50 border-t border-gray-700">
                            <p className="text-gray-300 text-sm leading-relaxed">
                              {item.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
