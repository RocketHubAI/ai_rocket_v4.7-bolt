import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, ArrowRight, ArrowLeft, Check, Loader,
  Lightbulb, Target, Zap, MessageCircle, X,
  Database, Clock, Mail, Webhook, FileText, BarChart
} from 'lucide-react';
import { n8nService } from '../lib/n8n-service';
import { generateNodesForUseCase } from '../lib/workflow-node-generator';
import { useAuth } from '../contexts/AuthContext';

interface UseCaseScenario {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  examples: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const useCaseScenarios: UseCaseScenario[] = [
  {
    id: 'daily-reports',
    title: 'Automated Daily Reports',
    description: 'Generate and send daily business reports automatically',
    icon: <BarChart className="w-6 h-6" />,
    category: 'reporting',
    examples: [
      'Daily sales summary emails',
      'Team activity reports',
      'KPI dashboards updates',
    ],
    difficulty: 'beginner',
  },
  {
    id: 'data-sync',
    title: 'Data Synchronization',
    description: 'Keep data in sync across multiple platforms automatically',
    icon: <Database className="w-6 h-6" />,
    category: 'integration',
    examples: [
      'Sync CRM with Google Sheets',
      'Update multiple databases',
      'Cross-platform data backup',
    ],
    difficulty: 'intermediate',
  },
  {
    id: 'webhook-processing',
    title: 'Webhook Processing',
    description: 'Receive and process data from external services',
    icon: <Webhook className="w-6 h-6" />,
    category: 'integration',
    examples: [
      'Process payment notifications',
      'Handle form submissions',
      'Receive API callbacks',
    ],
    difficulty: 'intermediate',
  },
  {
    id: 'scheduled-tasks',
    title: 'Scheduled Automation',
    description: 'Run tasks automatically at specific times',
    icon: <Clock className="w-6 h-6" />,
    category: 'automation',
    examples: [
      'Weekly data backups',
      'Monthly report generation',
      'Hourly status checks',
    ],
    difficulty: 'beginner',
  },
  {
    id: 'notifications',
    title: 'Smart Notifications',
    description: 'Send alerts based on conditions or events',
    icon: <Mail className="w-6 h-6" />,
    category: 'communication',
    examples: [
      'Slack alerts for errors',
      'Email notifications for milestones',
      'SMS for urgent events',
    ],
    difficulty: 'beginner',
  },
  {
    id: 'document-processing',
    title: 'Document Processing',
    description: 'Automate document creation and management',
    icon: <FileText className="w-6 h-6" />,
    category: 'productivity',
    examples: [
      'Auto-generate invoices',
      'Create PDF reports',
      'Process uploaded files',
    ],
    difficulty: 'advanced',
  },
];

interface AstraGuidedAgentBuilderProps {
  onClose: () => void;
  onComplete?: (workflowId: string) => void;
}

export const AstraGuidedAgentBuilder: React.FC<AstraGuidedAgentBuilderProps> = ({
  onClose,
  onComplete
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedUseCase, setSelectedUseCase] = useState<UseCaseScenario | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [customRequirements, setCustomRequirements] = useState('');
  const [astraResponse, setAstraResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 4;

  const handleUseCaseSelect = (useCase: UseCaseScenario) => {
    setSelectedUseCase(useCase);
    setWorkflowName(`${useCase.title} Agent`);
    setWorkflowDescription(useCase.description);
  };

  const handleAstraGuidance = async () => {
    if (!selectedUseCase) return;

    setLoading(true);
    setError('');

    try {
      const prompt = `
I want to create a workflow for: ${selectedUseCase.title}
Description: ${selectedUseCase.description}
${customRequirements ? `Additional requirements: ${customRequirements}` : ''}

Please provide:
1. A brief explanation of how this type of automation works
2. The key components I'll need (trigger, data processing, actions)
3. Step-by-step guidance on what nodes to use
4. Best practices for this type of workflow

Keep it practical and beginner-friendly.
      `.trim();

      // Simulate Astra response (in production, this would call your AI service)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const simulatedResponse = generateAstraGuidance(selectedUseCase, customRequirements);
      setAstraResponse(simulatedResponse);
    } catch (err: any) {
      setError('Failed to get guidance from Astra. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateAstraGuidance = (useCase: UseCaseScenario, requirements: string): string => {
    const guidanceMap: Record<string, string> = {
      'daily-reports': `
**Understanding Daily Report Automation**

This workflow will automatically generate and send reports at scheduled times. Here's how it works:

**Key Components:**
1. **Trigger**: Schedule Trigger (runs at specific times, like every morning at 9 AM)
2. **Data Collection**: HTTP Request or Database Query to fetch your data
3. **Processing**: Format the data into a readable report
4. **Action**: Send Email or post to Slack

**Step-by-Step Setup:**
1. Start with a Schedule Trigger node - set it to run daily at your preferred time
2. Add an HTTP Request or Postgres node to fetch your data
3. Use a Set node or Function node to format the data
4. Add an Email Send or Slack node to deliver the report

**Best Practices:**
- Test with a short interval first (every 5 minutes) before setting to daily
- Include error handling to catch data fetch failures
- Add date/time stamps to your reports
- Keep report formatting clean and easy to read

${requirements ? `\n**For your specific needs:** ${requirements}\nConsider adding conditional logic to handle different data scenarios.` : ''}
      `,
      'data-sync': `
**Understanding Data Synchronization**

This workflow keeps data consistent across multiple platforms automatically.

**Key Components:**
1. **Trigger**: Schedule Trigger (runs hourly, daily, etc.) or Webhook (real-time)
2. **Source**: Fetch data from your primary source
3. **Transformation**: Map and format data for the destination
4. **Destination**: Update the target system

**Step-by-Step Setup:**
1. Choose your trigger type - scheduled for regular syncs, webhook for real-time
2. Add nodes to fetch data from your source (HTTP Request, Database, API)
3. Use a Function node to transform data if formats differ
4. Add Merge or Split nodes if syncing multiple sources
5. End with nodes to update your destination systems

**Best Practices:**
- Always include conflict resolution logic
- Log sync operations for debugging
- Use batch processing for large datasets
- Implement retry logic for failed syncs
- Add validation to ensure data quality

${requirements ? `\n**Custom considerations:** ${requirements}` : ''}
      `,
      'webhook-processing': `
**Understanding Webhook Processing**

Webhooks let external services send data to your workflow in real-time.

**Key Components:**
1. **Trigger**: Webhook node (creates a unique URL to receive data)
2. **Validation**: Check incoming data is correct and authorized
3. **Processing**: Transform and act on the data
4. **Response**: Send a response back to the caller

**Step-by-Step Setup:**
1. Start with a Webhook Trigger - it will generate a unique URL
2. Add an IF node or Function node to validate the incoming data
3. Use Set nodes to extract and transform the data you need
4. Add action nodes (Database Insert, HTTP Request, etc.) to process the data
5. Configure the webhook to return a success response

**Best Practices:**
- Always validate webhook authenticity (signatures, tokens)
- Handle errors gracefully and return appropriate status codes
- Log all webhook calls for auditing
- Use database transactions for critical data
- Test with webhook testing tools before going live

${requirements ? `\n**Your requirements:** ${requirements}\nMake sure to add appropriate security validation.` : ''}
      `,
      'scheduled-tasks': `
**Understanding Scheduled Automation**

Scheduled workflows run automatically at specific times - like a smart cron job.

**Key Components:**
1. **Trigger**: Schedule Trigger (define when to run)
2. **Tasks**: The actions you want to perform
3. **Notifications**: Optional alerts when complete

**Step-by-Step Setup:**
1. Add a Schedule Trigger node - set your interval (hourly, daily, weekly, etc.)
2. Add nodes for your specific tasks (database cleanup, API calls, file operations)
3. Include an IF node to check conditions before running
4. Add notification nodes to confirm completion or alert on errors

**Best Practices:**
- Start with longer intervals while testing
- Add error handling for each critical step
- Include a "last run" timestamp in your data
- Use different schedules for different priorities
- Monitor execution history regularly

${requirements ? `\n**Based on your needs:** ${requirements}` : ''}
      `,
      'notifications': `
**Understanding Smart Notifications**

This workflow monitors conditions and sends alerts when specific events occur.

**Key Components:**
1. **Trigger**: Schedule or Webhook (depending on data source)
2. **Condition Check**: IF nodes to evaluate when to notify
3. **Message Formatting**: Prepare notification content
4. **Delivery**: Send via Email, Slack, SMS, etc.

**Step-by-Step Setup:**
1. Choose your trigger (scheduled checks or event-based webhook)
2. Add nodes to fetch the data you're monitoring
3. Use IF nodes to check if notification conditions are met
4. Add Set or Function nodes to format your message
5. Include notification channels (Email, Slack, Twilio for SMS)

**Best Practices:**
- Avoid notification fatigue - don't alert too frequently
- Include context in notifications (what, when, why, what to do)
- Add throttling to prevent duplicate alerts
- Use different channels for different urgency levels
- Test notification formatting on all target platforms

${requirements ? `\n**For your use case:** ${requirements}` : ''}
      `,
      'document-processing': `
**Understanding Document Processing**

Automate document creation, transformation, and management workflows.

**Key Components:**
1. **Trigger**: Schedule, Webhook, or File Upload event
2. **Data Gathering**: Collect information for the document
3. **Generation**: Create or modify documents
4. **Storage/Delivery**: Save and/or send the document

**Step-by-Step Setup:**
1. Choose your trigger based on when documents should be created
2. Add nodes to gather data (Database, API, form submissions)
3. Use Function nodes to format data for document templates
4. Add document generation nodes (PDF, Excel, Word)
5. Store in cloud storage or send via email

**Best Practices:**
- Use templates for consistent formatting
- Validate all data before document generation
- Include error handling for missing data
- Store documents with meaningful filenames (date, ID, purpose)
- Add version control if documents will be updated
- Test with various data scenarios

${requirements ? `\n**Specific to your needs:** ${requirements}` : ''}
      `,
    };

    return guidanceMap[useCase.id] || 'General workflow guidance will be provided based on your selection.';
  };

  const handleCreateWorkflow = async () => {
    if (!selectedUseCase || !workflowName.trim()) {
      setError('Please complete all required fields');
      return;
    }

    setCreating(true);
    setError('');

    try {
      // Generate nodes for the selected use case
      const nodeTemplate = generateNodesForUseCase(selectedUseCase.id, customRequirements);

      // Create the workflow in n8n with pre-configured nodes
      const workflow = await n8nService.createWorkflow({
        name: workflowName,
        nodes: nodeTemplate.nodes,
        connections: nodeTemplate.connections,
        settings: {},
      });

      // Save metadata with setup instructions
      await n8nService.saveWorkflowMetadata(
        workflow.id,
        workflowName,
        `${workflowDescription}\n\nUse Case: ${selectedUseCase.title}\n${customRequirements ? `\nRequirements: ${customRequirements}` : ''}\n\n${nodeTemplate.instructions}`
      );

      // Navigate to the workflow detail page
      if (onComplete) {
        onComplete(workflow.id);
      } else {
        navigate(`/build-agents/workflow/${workflow.id}`);
      }
    } catch (err: any) {
      console.error('Error creating workflow:', err);
      setError(err.message || 'Failed to create workflow');
      setCreating(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-500/20';
      case 'intermediate': return 'text-yellow-400 bg-yellow-500/20';
      case 'advanced': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-purple-500/30">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm border-b border-purple-500/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Astra-Guided Agent Builder</h2>
                <p className="text-sm text-purple-300">Step {step} of {totalSteps}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start space-x-3">
              <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Introduction */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Lightbulb className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Welcome to Agent Building!</h3>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  Agents are automated workflows that help you get work done without manual effort.
                  Let me guide you through creating your first agent!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <Target className="w-8 h-8 text-purple-400 mb-3" />
                  <h4 className="text-white font-semibold mb-2">Choose Your Goal</h4>
                  <p className="text-gray-400 text-sm">
                    Select from common automation scenarios or describe your own
                  </p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <MessageCircle className="w-8 h-8 text-blue-400 mb-3" />
                  <h4 className="text-white font-semibold mb-2">Get Guidance</h4>
                  <p className="text-gray-400 text-sm">
                    Astra will explain how to build your workflow step-by-step
                  </p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <Zap className="w-8 h-8 text-green-400 mb-3" />
                  <h4 className="text-white font-semibold mb-2">Build & Deploy</h4>
                  <p className="text-gray-400 text-sm">
                    Create your agent and activate it to start automating
                  </p>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <h4 className="text-blue-400 font-semibold mb-2 flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5" />
                  <span>What You'll Learn</span>
                </h4>
                <ul className="space-y-2 text-blue-300 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>How automated workflows save time and reduce errors</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Common automation patterns and when to use them</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Best practices for reliable, maintainable agents</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Use Case Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white">Choose Your Automation Scenario</h3>
                <p className="text-gray-400">
                  Select a common use case to get started, or you can customize it later
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {useCaseScenarios.map((useCase) => (
                  <button
                    key={useCase.id}
                    onClick={() => handleUseCaseSelect(useCase)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      selectedUseCase?.id === useCase.id
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        selectedUseCase?.id === useCase.id
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {useCase.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-white font-semibold">{useCase.title}</h4>
                          {selectedUseCase?.id === useCase.id && (
                            <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{useCase.description}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(useCase.difficulty)}`}>
                            {useCase.difficulty}
                          </span>
                          <span className="text-xs text-gray-500">{useCase.category}</span>
                        </div>
                        {selectedUseCase?.id === useCase.id && (
                          <div className="mt-3 space-y-1">
                            <p className="text-xs text-purple-400 font-medium">Examples:</p>
                            {useCase.examples.map((example, idx) => (
                              <p key={idx} className="text-xs text-gray-400 pl-3">• {example}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Get Astra Guidance */}
          {step === 3 && selectedUseCase && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white">Let's Understand How This Works</h3>
                <p className="text-gray-400">
                  Astra will explain the workflow structure and guide you through building it
                </p>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    {selectedUseCase.icon}
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">{selectedUseCase.title}</h4>
                    <p className="text-gray-400 text-sm">{selectedUseCase.description}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Any specific requirements? (Optional)
                </label>
                <textarea
                  value={customRequirements}
                  onChange={(e) => setCustomRequirements(e.target.value)}
                  placeholder="e.g., I need to send reports to 3 different email addresses, or I want to filter data by date range..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {!astraResponse && (
                <button
                  onClick={handleAstraGuidance}
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all flex items-center justify-center space-x-2 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Astra is thinking...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Get Astra's Guidance</span>
                    </>
                  )}
                </button>
              )}

              {astraResponse && (
                <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h4 className="text-purple-400 font-semibold">Astra's Guidance</h4>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                      {astraResponse}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Name and Create */}
          {step === 4 && selectedUseCase && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white">Name Your Agent</h3>
                <p className="text-gray-400">
                  Give your agent a name and we'll create it for you to customize
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="My Automated Workflow"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={workflowDescription}
                    onChange={(e) => setWorkflowDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <h4 className="text-blue-400 font-semibold mb-3 flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5" />
                  <span>What Happens Next?</span>
                </h4>
                <ol className="space-y-2 text-blue-300 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold mt-0.5">1.</span>
                    <span>We'll create your agent with the basic structure</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold mt-0.5">2.</span>
                    <span>You can add and configure nodes based on Astra's guidance</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold mt-0.5">3.</span>
                    <span>Test your workflow with the Execute button</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold mt-0.5">4.</span>
                    <span>Activate it when you're ready to automate!</span>
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-all ${
                    s === step ? 'bg-purple-500 w-8' : s < step ? 'bg-purple-700' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {step < totalSteps ? (
              <button
                onClick={() => {
                  if (step === 2 && !selectedUseCase) {
                    setError('Please select a use case to continue');
                    return;
                  }
                  if (step === 3 && !astraResponse) {
                    setError('Please get guidance from Astra before continuing');
                    return;
                  }
                  setError('');
                  setStep(step + 1);
                }}
                disabled={step === 2 && !selectedUseCase}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all flex items-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreateWorkflow}
                disabled={creating || !workflowName.trim()}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all flex items-center space-x-2 font-semibold"
              >
                {creating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Creating Agent...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Create My Agent</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
