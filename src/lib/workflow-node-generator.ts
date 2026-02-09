import { N8NNode } from './n8n-service';

export interface WorkflowNodeTemplate {
  nodes: N8NNode[];
  connections: Record<string, any>;
  instructions: string;
}

export function generateNodesForUseCase(
  useCaseId: string,
  customRequirements?: string
): WorkflowNodeTemplate {
  const templates: Record<string, WorkflowNodeTemplate> = {
    'daily-reports': {
      nodes: [
        {
          id: 'schedule-trigger',
          name: 'Daily Schedule',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.1,
          position: [240, 300],
          parameters: {
            rule: {
              interval: [
                {
                  field: 'hours',
                  hoursInterval: 24,
                },
              ],
            },
            triggerTimes: {
              item: [
                {
                  hour: 9,
                  minute: 0,
                },
              ],
            },
          },
        },
        {
          id: 'http-request',
          name: 'Fetch Data',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [460, 300],
          parameters: {
            method: 'GET',
            url: '={{ $env.DATA_SOURCE_URL }}',
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            options: {},
          },
        },
        {
          id: 'code',
          name: 'Format Report',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [680, 300],
          parameters: {
            language: 'javaScript',
            jsCode: `// Format the data into a readable report
const data = $input.all();
const reportDate = new Date().toISOString().split('T')[0];

// Build the report
let report = \`Daily Report - \${reportDate}\\n\\n\`;
report += \`Total Records: \${data.length}\\n\\n\`;

// Add your custom formatting here
data.forEach((item, index) => {
  report += \`\${index + 1}. \${JSON.stringify(item.json, null, 2)}\\n\`;
});

return [{ json: { report, date: reportDate, recordCount: data.length } }];`,
          },
        },
        {
          id: 'send-email',
          name: 'Send Email',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2.1,
          position: [900, 300],
          parameters: {
            fromEmail: '={{ $env.SENDER_EMAIL }}',
            toEmail: '={{ $env.RECIPIENT_EMAIL }}',
            subject: '=Daily Report - {{ $now.format("yyyy-MM-dd") }}',
            emailType: 'text',
            message: '={{ $json.report }}',
          },
        },
      ],
      connections: {
        'Daily Schedule': {
          main: [[{ node: 'Fetch Data', type: 'main', index: 0 }]],
        },
        'Fetch Data': {
          main: [[{ node: 'Format Report', type: 'main', index: 0 }]],
        },
        'Format Report': {
          main: [[{ node: 'Send Email', type: 'main', index: 0 }]],
        },
      },
      instructions: `Your workflow has been created with 4 nodes:

1. **Daily Schedule** - Runs every day at 9 AM
2. **Fetch Data** - Gets data from your source (configure the URL)
3. **Format Report** - Transforms data into a readable report
4. **Send Email** - Delivers the report via email

Next Steps:
- Click "Edit in N8N" to configure the data source URL
- Set your email addresses in the Send Email node
- Test the workflow with the Execute button
- Activate when ready!`,
    },

    'data-sync': {
      nodes: [
        {
          id: 'schedule-trigger',
          name: 'Sync Schedule',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.1,
          position: [240, 300],
          parameters: {
            rule: {
              interval: [
                {
                  field: 'hours',
                  hoursInterval: 1,
                },
              ],
            },
          },
        },
        {
          id: 'http-source',
          name: 'Fetch from Source',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [460, 300],
          parameters: {
            method: 'GET',
            url: '={{ $env.SOURCE_API_URL }}',
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
          },
        },
        {
          id: 'code-transform',
          name: 'Transform Data',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [680, 300],
          parameters: {
            language: 'javaScript',
            jsCode: `// Transform data for destination format
const items = $input.all();

return items.map(item => {
  const data = item.json;

  // Map fields from source to destination format
  return {
    json: {
      id: data.id || data._id,
      name: data.name || data.title,
      updatedAt: new Date().toISOString(),
      // Add your field mappings here
      ...data
    }
  };
});`,
          },
        },
        {
          id: 'http-destination',
          name: 'Sync to Destination',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [900, 300],
          parameters: {
            method: 'POST',
            url: '={{ $env.DESTINATION_API_URL }}',
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: 'data',
                  value: '={{ $json }}',
                },
              ],
            },
          },
        },
      ],
      connections: {
        'Sync Schedule': {
          main: [[{ node: 'Fetch from Source', type: 'main', index: 0 }]],
        },
        'Fetch from Source': {
          main: [[{ node: 'Transform Data', type: 'main', index: 0 }]],
        },
        'Transform Data': {
          main: [[{ node: 'Sync to Destination', type: 'main', index: 0 }]],
        },
      },
      instructions: `Your sync workflow includes:

1. **Sync Schedule** - Runs every hour
2. **Fetch from Source** - Retrieves data from your source system
3. **Transform Data** - Maps fields to destination format
4. **Sync to Destination** - Updates the target system

Configuration Required:
- Set SOURCE_API_URL in environment variables
- Set DESTINATION_API_URL in environment variables
- Customize field mappings in Transform Data node
- Add authentication credentials for both systems`,
    },

    'webhook-processing': {
      nodes: [
        {
          id: 'webhook-trigger',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: [240, 300],
          parameters: {
            path: 'incoming-data',
            httpMethod: 'POST',
            responseMode: 'responseNode',
            options: {},
          },
        },
        {
          id: 'code-validate',
          name: 'Validate Data',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [460, 300],
          parameters: {
            language: 'javaScript',
            jsCode: `// Validate incoming webhook data
const data = $input.first().json;

// Check required fields
const requiredFields = ['id', 'timestamp'];
const missingFields = requiredFields.filter(field => !data[field]);

if (missingFields.length > 0) {
  throw new Error(\`Missing required fields: \${missingFields.join(', ')}\`);
}

// Add validation timestamp
return [{
  json: {
    ...data,
    validatedAt: new Date().toISOString(),
    isValid: true
  }
}];`,
          },
        },
        {
          id: 'if-condition',
          name: 'Check Type',
          type: 'n8n-nodes-base.if',
          typeVersion: 2,
          position: [680, 300],
          parameters: {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
              },
              conditions: [
                {
                  id: 'condition-1',
                  leftValue: '={{ $json.type }}',
                  rightValue: 'important',
                  operator: {
                    type: 'string',
                    operation: 'equals',
                  },
                },
              ],
              combinator: 'and',
            },
            options: {},
          },
        },
        {
          id: 'http-process',
          name: 'Process Data',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [900, 200],
          parameters: {
            method: 'POST',
            url: '={{ $env.PROCESSING_API_URL }}',
            sendBody: true,
            bodyParameters: {
              parameters: [
                {
                  name: 'data',
                  value: '={{ $json }}',
                },
              ],
            },
          },
        },
        {
          id: 'webhook-response',
          name: 'Respond',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1.1,
          position: [1120, 300],
          parameters: {
            respondWith: 'json',
            responseBody: '={{ { "status": "success", "message": "Data processed", "id": $json.id } }}',
          },
        },
      ],
      connections: {
        Webhook: {
          main: [[{ node: 'Validate Data', type: 'main', index: 0 }]],
        },
        'Validate Data': {
          main: [[{ node: 'Check Type', type: 'main', index: 0 }]],
        },
        'Check Type': {
          main: [
            [{ node: 'Process Data', type: 'main', index: 0 }],
            [{ node: 'Respond', type: 'main', index: 0 }],
          ],
        },
        'Process Data': {
          main: [[{ node: 'Respond', type: 'main', index: 0 }]],
        },
      },
      instructions: `Your webhook processor is ready:

1. **Webhook** - Receives POST requests at /incoming-data
2. **Validate Data** - Checks required fields
3. **Check Type** - Routes based on data type
4. **Process Data** - Handles important data
5. **Respond** - Returns success confirmation

Setup Steps:
- Your webhook URL will be: https://your-n8n-url.com/webhook/incoming-data
- Configure the Processing API URL for important data
- Test with curl or Postman before going live
- Add authentication if needed (webhook settings)`,
    },

    'scheduled-tasks': {
      nodes: [
        {
          id: 'schedule-trigger',
          name: 'Task Schedule',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.1,
          position: [240, 300],
          parameters: {
            rule: {
              interval: [
                {
                  field: 'hours',
                  hoursInterval: 6,
                },
              ],
            },
          },
        },
        {
          id: 'code-task',
          name: 'Run Task',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [460, 300],
          parameters: {
            language: 'javaScript',
            jsCode: `// Your scheduled task logic
const now = new Date();

// Example: Cleanup old records
const result = {
  taskName: 'Scheduled Cleanup',
  executedAt: now.toISOString(),
  status: 'completed'
};

// Add your task logic here

return [{ json: result }];`,
          },
        },
        {
          id: 'if-errors',
          name: 'Check for Errors',
          type: 'n8n-nodes-base.if',
          typeVersion: 2,
          position: [680, 300],
          parameters: {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
              },
              conditions: [
                {
                  id: 'condition-1',
                  leftValue: '={{ $json.status }}',
                  rightValue: 'error',
                  operator: {
                    type: 'string',
                    operation: 'equals',
                  },
                },
              ],
              combinator: 'and',
            },
          },
        },
        {
          id: 'send-notification',
          name: 'Send Alert',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2.1,
          position: [900, 200],
          parameters: {
            fromEmail: '={{ $env.ALERT_FROM_EMAIL }}',
            toEmail: '={{ $env.ALERT_TO_EMAIL }}',
            subject: '=Task Failed: {{ $json.taskName }}',
            emailType: 'text',
            message: '=Task execution failed at {{ $json.executedAt }}',
          },
        },
      ],
      connections: {
        'Task Schedule': {
          main: [[{ node: 'Run Task', type: 'main', index: 0 }]],
        },
        'Run Task': {
          main: [[{ node: 'Check for Errors', type: 'main', index: 0 }]],
        },
        'Check for Errors': {
          main: [[{ node: 'Send Alert', type: 'main', index: 0 }], []],
        },
      },
      instructions: `Your scheduled task workflow:

1. **Task Schedule** - Runs every 6 hours
2. **Run Task** - Executes your custom logic
3. **Check for Errors** - Monitors task success
4. **Send Alert** - Notifies on failures

Customization:
- Adjust schedule interval in Task Schedule node
- Add your task logic in the Run Task node
- Configure alert email addresses
- Test with shorter intervals first`,
    },

    'notifications': {
      nodes: [
        {
          id: 'schedule-trigger',
          name: 'Check Interval',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.1,
          position: [240, 300],
          parameters: {
            rule: {
              interval: [
                {
                  field: 'minutes',
                  minutesInterval: 15,
                },
              ],
            },
          },
        },
        {
          id: 'http-check',
          name: 'Check Condition',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [460, 300],
          parameters: {
            method: 'GET',
            url: '={{ $env.MONITORING_URL }}',
          },
        },
        {
          id: 'if-alert',
          name: 'Should Alert?',
          type: 'n8n-nodes-base.if',
          typeVersion: 2,
          position: [680, 300],
          parameters: {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
              },
              conditions: [
                {
                  id: 'condition-1',
                  leftValue: '={{ $json.status }}',
                  rightValue: 'alert',
                  operator: {
                    type: 'string',
                    operation: 'equals',
                  },
                },
              ],
              combinator: 'and',
            },
          },
        },
        {
          id: 'code-format',
          name: 'Format Message',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [900, 200],
          parameters: {
            language: 'javaScript',
            jsCode: `// Format alert message
const data = $input.first().json;

return [{
  json: {
    title: 'Alert: ' + (data.title || 'Condition Met'),
    message: data.message || 'An alert condition was detected',
    timestamp: new Date().toISOString(),
    severity: data.severity || 'medium',
    details: data
  }
}];`,
          },
        },
        {
          id: 'send-notification',
          name: 'Send Notification',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2.1,
          position: [1120, 200],
          parameters: {
            fromEmail: '={{ $env.ALERT_FROM_EMAIL }}',
            toEmail: '={{ $env.ALERT_TO_EMAIL }}',
            subject: '={{ $json.title }}',
            emailType: 'text',
            message: '={{ $json.message }}\\n\\nTime: {{ $json.timestamp }}\\nSeverity: {{ $json.severity }}',
          },
        },
      ],
      connections: {
        'Check Interval': {
          main: [[{ node: 'Check Condition', type: 'main', index: 0 }]],
        },
        'Check Condition': {
          main: [[{ node: 'Should Alert?', type: 'main', index: 0 }]],
        },
        'Should Alert?': {
          main: [[{ node: 'Format Message', type: 'main', index: 0 }], []],
        },
        'Format Message': {
          main: [[{ node: 'Send Notification', type: 'main', index: 0 }]],
        },
      },
      instructions: `Your notification workflow:

1. **Check Interval** - Monitors every 15 minutes
2. **Check Condition** - Fetches monitoring data
3. **Should Alert?** - Evaluates alert conditions
4. **Format Message** - Prepares notification content
5. **Send Notification** - Delivers alert via email

Setup Required:
- Set MONITORING_URL to your monitoring endpoint
- Configure alert email addresses
- Adjust check interval based on urgency
- Customize alert conditions in Should Alert node`,
    },

    'document-processing': {
      nodes: [
        {
          id: 'webhook-trigger',
          name: 'Document Upload',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: [240, 300],
          parameters: {
            path: 'process-document',
            httpMethod: 'POST',
            responseMode: 'responseNode',
          },
        },
        {
          id: 'code-extract',
          name: 'Extract Data',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [460, 300],
          parameters: {
            language: 'javaScript',
            jsCode: `// Extract data from document
const input = $input.first().json;

return [{
  json: {
    documentId: input.id || Date.now(),
    extractedData: input.data || input,
    processedAt: new Date().toISOString()
  }
}];`,
          },
        },
        {
          id: 'code-generate',
          name: 'Generate Document',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [680, 300],
          parameters: {
            language: 'javaScript',
            jsCode: `// Generate document content
const data = $input.first().json;

// Format document content
const content = \`
Document Report
Generated: \${new Date().toISOString()}

Data:
\${JSON.stringify(data.extractedData, null, 2)}
\`;

return [{
  json: {
    ...data,
    documentContent: content,
    filename: \`document_\${data.documentId}.txt\`
  }
}];`,
          },
        },
        {
          id: 'webhook-response',
          name: 'Return Document',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1.1,
          position: [900, 300],
          parameters: {
            respondWith: 'json',
            responseBody: '={{ { "status": "success", "documentId": $json.documentId, "filename": $json.filename } }}',
          },
        },
      ],
      connections: {
        'Document Upload': {
          main: [[{ node: 'Extract Data', type: 'main', index: 0 }]],
        },
        'Extract Data': {
          main: [[{ node: 'Generate Document', type: 'main', index: 0 }]],
        },
        'Generate Document': {
          main: [[{ node: 'Return Document', type: 'main', index: 0 }]],
        },
      },
      instructions: `Your document processor:

1. **Document Upload** - Receives document data
2. **Extract Data** - Parses document fields
3. **Generate Document** - Creates output document
4. **Return Document** - Sends back result

Configuration:
- Webhook URL: https://your-n8n-url.com/webhook/process-document
- Customize data extraction logic
- Add document formatting as needed
- Consider adding file storage (S3, Google Drive)`,
    },
  };

  return templates[useCaseId] || templates['scheduled-tasks'];
}
