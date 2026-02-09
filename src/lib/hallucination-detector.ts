import { supabase } from './supabase';

interface TeamValidationData {
  teamName: string;
  teamMembers: string[];
  meetingTypes: string[];
  industries: string[];
  customTopics: string;
}

interface ValidationResult {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  issues: string[];
  warnings: string[];
}

/**
 * Hallucination Detection Service
 * Validates AI responses against known team data to prevent displaying hallucinated content
 */
export class HallucinationDetector {
  private validationData: TeamValidationData | null = null;
  private teamId: string | null = null;

  /**
   * Load validation data for a specific team
   */
  async loadTeamData(teamId: string): Promise<void> {
    this.teamId = teamId;

    try {
      // Fetch team name
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single();

      // Fetch team members
      const { data: members } = await supabase
        .from('users')
        .select('name, email')
        .eq('team_id', teamId);

      // Fetch team settings (meeting types, news preferences)
      const { data: settings } = await supabase
        .from('team_settings')
        .select('meeting_types, news_preferences')
        .eq('team_id', teamId)
        .single();

      // Extract member names (including email usernames)
      const memberNames: string[] = [];
      members?.forEach(member => {
        if (member.name) memberNames.push(member.name.toLowerCase());
        if (member.email) {
          const emailName = member.email.split('@')[0].toLowerCase();
          memberNames.push(emailName);
        }
      });

      // Extract meeting types
      const meetingTypes = settings?.meeting_types?.map((mt: any) => mt.type.toLowerCase()) || [];

      // Extract industries and topics
      const industries = settings?.news_preferences?.industries || [];
      const customTopics = settings?.news_preferences?.custom_topics || '';

      this.validationData = {
        teamName: team?.name || '',
        teamMembers: memberNames,
        meetingTypes,
        industries,
        customTopics
      };

    } catch (error) {
      console.error('Error loading team validation data:', error);
      this.validationData = null;
    }
  }

  /**
   * Validate an AI response for potential hallucinations
   */
  validateResponse(response: string): ValidationResult {
    if (!this.validationData) {
      // Don't show warning if we just can't validate - assume it's fine
      return {
        isValid: true,
        confidence: 'high',
        issues: [],
        warnings: []
      };
    }

    const issues: string[] = [];
    const warnings: string[] = [];
    const responseLower = response.toLowerCase();

    // ONLY CHECK 1: Generic placeholder content (this is a clear hallucination)
    if (this.hasPlaceholderContent(response)) {
      issues.push('Response contains generic placeholder content');
    }

    // ONLY CHECK 2: Look for other team names ONLY if the response explicitly claims to be about a specific team
    // Only flag if it says something like "Based on Acme Corp's data" when user's team is different
    const suspiciousTeamNames = this.detectSuspiciousTeamNames(response);
    if (suspiciousTeamNames.length > 0) {
      issues.push(`Response references a different team/company: ${suspiciousTeamNames.join(', ')}`);
    }

    // DISABLED: Don't check for unknown people - AI might reference examples or general people
    // DISABLED: Don't check meeting types - AI might be giving general advice
    // DISABLED: Don't check fabricated details - AI might use examples

    // Determine overall validity
    const isValid = issues.length === 0;
    const confidence = this.calculateConfidence(issues, warnings);

    return {
      isValid,
      confidence,
      issues,
      warnings
    };
  }

  /**
   * Detect mentions of team/company names that don't match the user's team
   * ONLY flag if response explicitly claims data is FROM a different company
   */
  private detectSuspiciousTeamNames(text: string): string[] {
    const suspicious: string[] = [];
    const teamNameLower = this.validationData!.teamName.toLowerCase();

    // VERY SPECIFIC patterns - only flag when AI claims to pull data from a specific company
    const specificPatterns = [
      /(?:based on|from|according to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:'s)?\s+(?:data|records|meeting|notes|team)/gi,
      /(?:your team at|you work at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];

    specificPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const name = match[1].toLowerCase();
        if (name && name !== teamNameLower && name.length > 2) {
          suspicious.push(match[1]);
        }
      }
    });

    return [...new Set(suspicious)]; // Remove duplicates
  }

  /**
   * Detect mentions of people not in the team
   */
  private detectUnknownPeople(text: string): string[] {
    const unknown: string[] = [];
    const knownMembers = this.validationData!.teamMembers;

    // Look for capitalized name patterns (First Last)
    const namePattern = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g;
    const matches = text.matchAll(namePattern);

    for (const match of matches) {
      const fullName = `${match[1]} ${match[2]}`.toLowerCase();
      const firstName = match[1].toLowerCase();
      const lastName = match[2].toLowerCase();

      // Check if any part of the name matches known members
      const isKnown = knownMembers.some(member =>
        member.includes(firstName) ||
        member.includes(lastName) ||
        member.includes(fullName)
      );

      if (!isKnown) {
        unknown.push(`${match[1]} ${match[2]}`);
      }
    }

    return [...new Set(unknown)];
  }

  /**
   * Detect meeting types not configured for this team
   */
  private detectInvalidMeetingTypes(text: string): string[] {
    const invalid: string[] = [];
    const knownTypes = this.validationData!.meetingTypes;

    // Common meeting type patterns
    const meetingPatterns = [
      /(\w+(?:\s+\w+)*)\s+meeting/gi,
      /meeting\s+(?:type|for|about):\s*(\w+(?:\s+\w+)*)/gi
    ];

    meetingPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const type = match[1].toLowerCase().trim();
        if (type && !knownTypes.some(known => known.includes(type) || type.includes(known))) {
          invalid.push(match[1]);
        }
      }
    });

    return [...new Set(invalid)];
  }

  /**
   * Detect fabricated specific details (phone numbers, addresses, specific dollar amounts)
   */
  private detectFabricatedDetails(text: string): string[] {
    const fabricated: string[] = [];

    // Phone numbers
    if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) {
      fabricated.push('phone numbers');
    }

    // Street addresses
    if (/\b\d+\s+[A-Z][a-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln)\b/.test(text)) {
      fabricated.push('street addresses');
    }

    // Very specific dollar amounts with decimals (likely fabricated)
    if (/\$\d+,\d+\.\d{2}/.test(text)) {
      fabricated.push('specific dollar amounts');
    }

    // Email addresses not from known domains
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
    const emails = text.match(emailPattern);
    if (emails && emails.length > 0) {
      // This would need enhancement to check against actual team email domains
      fabricated.push('email addresses');
    }

    return fabricated;
  }

  /**
   * Check for generic placeholder content
   * ONLY flag obvious placeholders that indicate the AI made up data
   */
  private hasPlaceholderContent(text: string): boolean {
    const placeholderPatterns = [
      /\b(?:john|jane)\s+doe\b/i,  // Only "John Doe" or "Jane Doe" - not "John Smith"
      /\bacme\s+corp(?:oration)?\b/i,  // Classic placeholder company
      /\bexample\.com\b/i,  // Placeholder email domain
      /\b555-\d{4}\b/,  // Movie phone number
      /\[(?:insert|placeholder|example|your|name|data).*?\]/i,  // Bracketed instructions
      /\{(?:insert|placeholder|example|your|name|data).*?\}/i,  // Curly brace instructions
    ];

    return placeholderPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Calculate confidence level based on issues and warnings
   */
  private calculateConfidence(issues: string[], warnings: string[]): 'high' | 'medium' | 'low' {
    if (issues.length > 0) return 'low';
    // Only reduce confidence if we have actual issues, not warnings
    return 'high';
  }

  /**
   * Quick check: Does response mention the correct team name?
   */
  hasCorrectTeamName(response: string): boolean {
    if (!this.validationData) return true; // Can't verify
    const teamName = this.validationData.teamName.toLowerCase();
    return response.toLowerCase().includes(teamName);
  }

  /**
   * Get a user-friendly warning message
   */
  getWarningMessage(result: ValidationResult): string | null {
    if (result.isValid && result.warnings.length === 0) return null;

    if (!result.isValid) {
      return "This response may contain inaccurate information. Please verify details before taking action.";
    }

    if (result.confidence === 'low') {
      return "This response may contain unverified information. Please use with caution.";
    }

    if (result.confidence === 'medium' && result.warnings.length > 0) {
      return "Some details in this response couldn't be verified against your team data.";
    }

    return null;
  }
}

// Singleton instance
let detectorInstance: HallucinationDetector | null = null;

/**
 * Get or create the hallucination detector instance
 */
export function getHallucinationDetector(): HallucinationDetector {
  if (!detectorInstance) {
    detectorInstance = new HallucinationDetector();
  }
  return detectorInstance;
}

/**
 * Initialize detector for a team (call this when user logs in or switches context)
 */
export async function initializeHallucinationDetector(teamId: string): Promise<void> {
  const detector = getHallucinationDetector();
  await detector.loadTeamData(teamId);
}

/**
 * Quick validation function for use in message handlers
 */
export async function validateAIResponse(
  response: string,
  teamId: string
): Promise<ValidationResult> {
  const detector = getHallucinationDetector();

  // Ensure data is loaded for this team
  if (!detector['validationData'] || detector['teamId'] !== teamId) {
    await detector.loadTeamData(teamId);
  }

  return detector.validateResponse(response);
}
