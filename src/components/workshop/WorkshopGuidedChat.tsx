import React, { useState, useEffect } from 'react';
import { Target, Sparkles, Send, Loader2, MessageSquare, Rocket } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Goal } from './WorkshopMindsetJourney';

interface GuidedPrompt {
  title: string;
  prompt: string;
  description: string;
}

interface WorkshopGuidedChatProps {
  goal: Goal;
  onSelectPrompt: (prompt: string) => void;
}

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export const WorkshopGuidedChat: React.FC<WorkshopGuidedChatProps> = ({
  goal,
  onSelectPrompt
}) => {
  const [prompts, setPrompts] = useState<GuidedPrompt[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generatePromptsForGoal();
  }, [goal.goalNumber]);

  const generatePromptsForGoal = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const systemPrompt = `You are an AI business coach helping entrepreneurs achieve their goals.

The user has set the following goal:
- Title: ${goal.goalTitle}
- Description: ${goal.goalDescription}
- Positive Impact 1: ${goal.positiveImpact1}
- Positive Impact 2: ${goal.positiveImpact2}
- Positive Impact 3: ${goal.positiveImpact3}

Generate exactly 3 conversation starter prompts that will help them work toward this goal. Each prompt should:
1. Be actionable and specific to their goal
2. Help them think strategically about achieving their goal
3. Focus on practical next steps or insights

Return ONLY a valid JSON array with exactly 3 objects, each having:
- title: A short catchy title (5-8 words)
- prompt: The actual question/prompt the user would ask (1-2 sentences)
- description: Why this prompt is valuable for their goal (1 sentence)

Example format:
[
  {"title": "Break Down Your First Milestone", "prompt": "Help me identify the first major milestone I need to hit for my goal and create an action plan to achieve it within 30 days.", "description": "Starting with clear milestones makes big goals achievable."},
  {"title": "Identify Key Resources Needed", "prompt": "What resources, skills, or connections do I need to gather to make progress on this goal?", "description": "Understanding resource requirements helps you plan effectively."},
  {"title": "Overcome Your Biggest Obstacle", "prompt": "What's likely to be my biggest obstacle in achieving this goal, and how can I proactively address it?", "description": "Anticipating challenges helps you stay on track."}
]`;

      const result = await model.generateContent(systemPrompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as GuidedPrompt[];
        if (Array.isArray(parsed) && parsed.length === 3) {
          setPrompts(parsed);
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (err) {
      console.error('Error generating prompts:', err);
      setPrompts([
        {
          title: "Create Your Action Plan",
          prompt: `Help me create a detailed action plan to achieve my goal: "${goal.goalTitle}". Break it down into weekly milestones for the next month.`,
          description: "A clear action plan turns aspirations into achievable steps."
        },
        {
          title: "Identify Success Metrics",
          prompt: `What metrics should I track to measure progress toward "${goal.goalTitle}"? Help me define what success looks like.`,
          description: "Measuring progress keeps you motivated and on track."
        },
        {
          title: "Overcome Potential Obstacles",
          prompt: `What are the most likely obstacles I'll face while pursuing "${goal.goalTitle}", and how can I prepare for them?`,
          description: "Anticipating challenges helps you build resilience."
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Preparing Your Chat</h2>
          <p className="text-gray-400 mb-6">
            Creating personalized prompts for your goal...
          </p>
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Start Your Conversation
            </h2>
            <p className="text-gray-400">
              Choose a prompt below to begin chatting with Astra about your goal
            </p>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">
                  {goal.goalTitle}
                </h3>
                <p className="text-sm text-gray-300">
                  {goal.goalDescription}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {prompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => onSelectPrompt(prompt.prompt)}
                className="w-full text-left p-5 rounded-xl border bg-gray-800/50 hover:bg-gray-800 border-gray-700 hover:border-cyan-500/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex-shrink-0 font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                        {prompt.title}
                      </h3>
                    </div>
                  </div>
                  <Send className="w-5 h-5 text-cyan-400 flex-shrink-0 ml-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-gray-300 mb-3 ml-13 pl-13" style={{ marginLeft: '52px' }}>
                  "{prompt.prompt}"
                </p>
                <div className="flex items-start gap-2" style={{ marginLeft: '52px' }}>
                  <Sparkles className="w-3 h-3 text-teal-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500">
                    {prompt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={generatePromptsForGoal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <Rocket className="w-4 h-4" />
              Generate different prompts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
