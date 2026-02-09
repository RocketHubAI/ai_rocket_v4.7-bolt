export interface FollowUpDetectionResult {
  isFollowUp: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  detectionType: FollowUpType | null;
  matchedPattern: string | null;
  selectedOption?: {
    optionNumber: number;
    optionText: string;
  };
}

export type FollowUpType =
  | 'confirmation'
  | 'option_selection'
  | 'clarification_request'
  | 'elaboration_request'
  | 'referential'
  | 'continuation'
  | 'negation';

interface PatternConfig {
  patterns: RegExp[];
  type: FollowUpType;
  confidence: 'high' | 'medium';
}

const FOLLOWUP_PATTERNS: PatternConfig[] = [
  {
    type: 'confirmation',
    confidence: 'high',
    patterns: [
      /^(yes|yeah|yep|yup|sure|ok|okay|definitely|absolutely|correct|right|affirmative|agreed|sounds good|perfect|great|exactly|that's right|that works|go ahead|let's do it|proceed|confirm|approved)[\s.,!?]*$/i,
      /^(yes|yeah|yep|yup|sure|ok|okay)[,.]?\s*(please|thanks|thank you|do it|go ahead|let's go|sounds good)/i,
    ]
  },
  {
    type: 'negation',
    confidence: 'high',
    patterns: [
      /^(no|nope|nah|not that|wrong|incorrect|that's not right|negative|cancel|stop|nevermind|never mind)[\s.,!?]*$/i,
      /^(no|nope)[,.]?\s*(thanks|thank you|that's not what I meant|try again)/i,
    ]
  },
  {
    type: 'option_selection',
    confidence: 'high',
    patterns: [
      /^(option|choice|number|#)?\s*([1-9]|one|two|three|four|five|first|second|third|fourth|fifth|the first|the second|the third)[\s.,!?]*$/i,
      /^(let's go with|i('ll| will) (take|choose|pick|go with)|i (want|choose|pick|prefer)|give me|show me)\s*(option|choice|number|#)?\s*([1-9]|one|two|three|four|five|the first|the second|the third)/i,
      /^(the )?(first|second|third|fourth|fifth|last|top|bottom)\s*(one|option|choice)?[\s.,!?]*$/i,
      /^([a-e]|option [a-e])[\s.,!?]*$/i,
    ]
  },
  {
    type: 'elaboration_request',
    confidence: 'high',
    patterns: [
      /^(tell me more|more details|explain|elaborate|expand on|go deeper|more info|more information|can you explain|please explain|what do you mean)[\s.,!?]*$/i,
      /^(tell me more|more details|explain more|elaborate more|expand more)\s*(about|on)?\s*(this|that|it)?[\s.,!?]*$/i,
      /^(can you|could you|please|would you)\s*(tell me more|explain|elaborate|expand|give me more details)/i,
      /^(i('d| would) like|i want)\s*(to know more|more details|more information|you to explain)/i,
    ]
  },
  {
    type: 'clarification_request',
    confidence: 'high',
    patterns: [
      /^(what do you mean|i don't understand|clarify|can you clarify|what does that mean|i'm confused|not sure I follow|could you clarify)[\s.,!?]*$/i,
      /^(what|how|why|when|where)\s*(exactly|specifically)?\s*(is|does|do|did|was|were|would|should|can|could)\s*(this|that|it)?[\s.,!?]*/i,
    ]
  },
  {
    type: 'referential',
    confidence: 'medium',
    patterns: [
      /^(this|that|it|these|those)\s+(is|are|was|were|looks|seems|sounds)?\s*(good|great|perfect|fine|interesting|helpful|useful|what I need|exactly what)?/i,
      /^(do|can|could|would|should|will)\s+(this|that|it)\s+/i,
      /^(what about|how about|regarding|concerning|as for)\s+(this|that|it|the|option)/i,
      /\b(this|that|it)\b.{0,20}$/i,
    ]
  },
  {
    type: 'continuation',
    confidence: 'medium',
    patterns: [
      /^(and|also|additionally|furthermore|moreover|plus|another thing|one more|next|continue|keep going|go on|what else|anything else)[\s.,!?]/i,
      /^(then|so|now)\s+(what|how|can|could|would|should)/i,
      /^what('s| is)?\s*(next|the next step|after that)/i,
    ]
  }
];

const SHORT_MESSAGE_THRESHOLD = 60;
const FOLLOWUP_TIME_WINDOW_MS = 3 * 60 * 1000;

export function detectFollowUpMessage(
  message: string,
  lastAstraMessageTimestamp?: Date,
  lastAstraMessageContent?: string
): FollowUpDetectionResult {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return {
      isFollowUp: false,
      confidence: 'none',
      detectionType: null,
      matchedPattern: null
    };
  }

  for (const config of FOLLOWUP_PATTERNS) {
    for (const pattern of config.patterns) {
      if (pattern.test(trimmedMessage)) {
        const result: FollowUpDetectionResult = {
          isFollowUp: true,
          confidence: config.confidence,
          detectionType: config.type,
          matchedPattern: pattern.source
        };

        if (config.type === 'option_selection' && lastAstraMessageContent) {
          const selectedOption = extractSelectedOption(trimmedMessage, lastAstraMessageContent);
          if (selectedOption) {
            result.selectedOption = selectedOption;
          }
        }

        return result;
      }
    }
  }

  const isShortMessage = trimmedMessage.length < SHORT_MESSAGE_THRESHOLD;
  const isWithinTimeWindow = lastAstraMessageTimestamp &&
    (Date.now() - lastAstraMessageTimestamp.getTime()) < FOLLOWUP_TIME_WINDOW_MS;

  if (isShortMessage && isWithinTimeWindow) {
    const hasReferentialWords = /\b(this|that|it|these|those|here|there)\b/i.test(trimmedMessage);
    const endsWithQuestion = trimmedMessage.endsWith('?');
    const startsWithQuestion = /^(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does|did)\b/i.test(trimmedMessage);

    if (hasReferentialWords || (endsWithQuestion && startsWithQuestion)) {
      return {
        isFollowUp: true,
        confidence: 'low',
        detectionType: 'referential',
        matchedPattern: 'timing_and_length_heuristic'
      };
    }
  }

  return {
    isFollowUp: false,
    confidence: 'none',
    detectionType: null,
    matchedPattern: null
  };
}

function extractSelectedOption(
  message: string,
  astraMessageContent: string
): { optionNumber: number; optionText: string } | null {
  const numberMatch = message.match(/([1-9]|one|two|three|four|five|first|second|third|fourth|fifth)/i);
  if (!numberMatch) return null;

  const numberMap: Record<string, number> = {
    '1': 1, 'one': 1, 'first': 1,
    '2': 2, 'two': 2, 'second': 2,
    '3': 3, 'three': 3, 'third': 3,
    '4': 4, 'four': 4, 'fourth': 4,
    '5': 5, 'five': 5, 'fifth': 5
  };

  const optionNumber = numberMap[numberMatch[1].toLowerCase()];
  if (!optionNumber) return null;

  const optionPatterns = [
    new RegExp(`${optionNumber}[.):>\\s]+([^\\n]+)`, 'i'),
    new RegExp(`\\*\\*${optionNumber}[.):>\\s]+([^\\n*]+)`, 'i'),
    new RegExp(`option\\s*${optionNumber}[.):>\\s]*([^\\n]+)`, 'i'),
    new RegExp(`- ${optionNumber}[.):>\\s]+([^\\n]+)`, 'i'),
    new RegExp(`\\n${optionNumber}[.):>\\s]+([^\\n]+)`, 'i'),
  ];

  for (const pattern of optionPatterns) {
    const match = astraMessageContent.match(pattern);
    if (match && match[1]) {
      return {
        optionNumber,
        optionText: match[1].trim().substring(0, 200)
      };
    }
  }

  const lines = astraMessageContent.split('\n');
  let currentOptionCount = 0;

  for (const line of lines) {
    if (/^[\s]*[-*•]?\s*\d+[.):>\s]|^[\s]*[-*•]\s+/i.test(line) || /^\s*\*\*\d+/i.test(line)) {
      currentOptionCount++;
      if (currentOptionCount === optionNumber) {
        const cleanedLine = line.replace(/^[\s]*[-*•]?\s*\d+[.):>\s]*/, '').replace(/^\*\*\d+[.):>\s]*/, '').trim();
        if (cleanedLine) {
          return {
            optionNumber,
            optionText: cleanedLine.substring(0, 200)
          };
        }
      }
    }
  }

  return {
    optionNumber,
    optionText: `Option ${optionNumber}`
  };
}

export function shouldShowFollowUpSuggestion(detection: FollowUpDetectionResult): boolean {
  if (!detection.isFollowUp) return false;
  return detection.confidence === 'medium' || detection.confidence === 'low';
}

export function getFollowUpSuggestionText(detection: FollowUpDetectionResult): string {
  switch (detection.detectionType) {
    case 'option_selection':
      if (detection.selectedOption) {
        return `Selecting option ${detection.selectedOption.optionNumber} from Astra's last response?`;
      }
      return "Selecting an option from Astra's last response?";
    case 'referential':
      return "Referring to Astra's last response?";
    case 'continuation':
      return "Continuing from Astra's last response?";
    case 'clarification_request':
      return "Asking about Astra's last response?";
    case 'elaboration_request':
      return "Want more details about Astra's last response?";
    default:
      return "Replying to Astra's last message?";
  }
}

export interface EnhancedPayloadContext {
  recent_context: string;
  recent_context_message_id: string;
  recent_context_timestamp: string;
  is_likely_followup: boolean;
  followup_confidence: 'high' | 'medium' | 'low' | 'none';
  followup_type: FollowUpType | null;
  selected_option?: {
    option_number: number;
    option_text: string;
  };
  conversation_context?: {
    last_user_message?: string;
    last_astra_response?: string;
    message_count: number;
  };
}

export function buildEnhancedPayloadContext(
  userMessage: string,
  lastAstraMessage: {
    id: string;
    content: string;
    timestamp: Date;
  } | null,
  lastUserMessage?: string,
  messageCount?: number
): EnhancedPayloadContext | null {
  if (!lastAstraMessage) {
    return null;
  }

  const detection = detectFollowUpMessage(
    userMessage,
    lastAstraMessage.timestamp,
    lastAstraMessage.content
  );

  const context: EnhancedPayloadContext = {
    recent_context: lastAstraMessage.content,
    recent_context_message_id: lastAstraMessage.id,
    recent_context_timestamp: lastAstraMessage.timestamp.toISOString(),
    is_likely_followup: detection.isFollowUp,
    followup_confidence: detection.confidence,
    followup_type: detection.detectionType,
    conversation_context: {
      last_user_message: lastUserMessage,
      last_astra_response: lastAstraMessage.content.substring(0, 500),
      message_count: messageCount || 0
    }
  };

  if (detection.selectedOption) {
    context.selected_option = {
      option_number: detection.selectedOption.optionNumber,
      option_text: detection.selectedOption.optionText
    };
  }

  return context;
}
