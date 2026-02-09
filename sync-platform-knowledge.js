import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncPlatformKnowledge() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const mdPath = path.join(__dirname, 'AI_ROCKET_KEY_FEATURES.md');
  const mdContent = fs.readFileSync(mdPath, 'utf-8');

  const coreFeatures = extractCoreFeatures(mdContent);
  const comingSoonFeatures = extractComingSoonFeatures(mdContent);
  const navigationTargets = extractNavigationTargets(coreFeatures);
  const howToGuides = extractHowToGuides(mdContent);

  const platformCapabilities = buildPlatformCapabilities(coreFeatures, comingSoonFeatures);
  const helpAssistantContext = buildHelpAssistantContext(coreFeatures, comingSoonFeatures, howToGuides);

  generateTypeScriptFile(platformCapabilities, navigationTargets, helpAssistantContext);

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('Skipping database sync - missing SUPABASE_SERVICE_ROLE_KEY');
    console.log('TypeScript file generated successfully');
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/platform_knowledge?id=eq.features`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        content: platformCapabilities,
        updated_at: new Date().toISOString(),
        updated_by: 'build-sync'
      })
    });

    if (!response.ok) {
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/platform_knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id: 'features',
          content: platformCapabilities,
          updated_at: new Date().toISOString(),
          updated_by: 'build-sync'
        })
      });

      if (!insertResponse.ok) {
        throw new Error(`Failed to sync: ${insertResponse.status}`);
      }
    }

    const navResponse = await fetch(`${supabaseUrl}/rest/v1/platform_knowledge?id=eq.navigation_targets`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        content: JSON.stringify(navigationTargets),
        updated_at: new Date().toISOString(),
        updated_by: 'build-sync'
      })
    });

    if (!navResponse.ok) {
      await fetch(`${supabaseUrl}/rest/v1/platform_knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id: 'navigation_targets',
          content: JSON.stringify(navigationTargets),
          updated_at: new Date().toISOString(),
          updated_by: 'build-sync'
        })
      });
    }

    console.log('Platform knowledge synced successfully');
  } catch (error) {
    console.error('Error syncing platform knowledge:', error.message);
  }
}

function extractCoreFeatures(mdContent) {
  const features = [];
  const coreSection = mdContent.match(/## Core Features \(Current\)([\s\S]*?)(?=## Coming Soon|$)/i);

  if (!coreSection) return features;

  const featureBlocks = coreSection[1].split(/### \d+\./);

  for (const block of featureBlocks) {
    if (!block.trim()) continue;

    const lines = block.trim().split('\n');
    const titleLine = lines[0];
    const title = titleLine.replace(/\(.*?\)/g, '').trim();

    if (!title) continue;

    const bulletPoints = [];
    let impact = '';

    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- **') && trimmed.includes('**:')) {
        continue;
      }
      if (trimmed.startsWith('- ') && !trimmed.startsWith('- **')) {
        bulletPoints.push(trimmed.substring(2));
      }
      if (trimmed.toLowerCase().startsWith('impact:')) {
        impact = trimmed.substring(7).trim();
      }
    }

    features.push({ title, bulletPoints, impact });
  }

  return features;
}

function extractComingSoonFeatures(mdContent) {
  const features = [];
  const comingSoonSection = mdContent.match(/## Coming Soon Features([\s\S]*?)(?=---|$)/i);

  if (!comingSoonSection) return features;

  const featureBlocks = comingSoonSection[1].split(/### \d+\./);

  for (const block of featureBlocks) {
    if (!block.trim()) continue;

    const lines = block.trim().split('\n');
    const title = lines[0].trim();

    if (!title) continue;

    const bulletPoints = [];

    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') && !trimmed.startsWith('- **')) {
        bulletPoints.push(trimmed.substring(2));
      }
    }

    features.push({ title, bulletPoints, status: 'Coming Soon' });
  }

  return features;
}

function extractNavigationTargets(coreFeatures) {
  const targets = {
    'mission-control': 'Mission Control - Track progress, achievements, and Launch Points',
    'reports': 'AI Reports - Schedule automated reports delivered to inbox',
    'team': 'Team Chat - Collaborate with team and AI together',
    'visualizations': 'Visualizations - View saved charts and graphs',
    'team-dashboard': 'Team Dashboard - AI-powered daily insights on metrics and goals',
    'creative-suite': 'Creative Suite - Generate AI images and presentations',
    'agent-chat': 'Agent Chat - Powerful AI queries, document search, and cross-category analysis'
  };

  return targets;
}

function buildPlatformCapabilities(coreFeatures, comingSoonFeatures) {
  let output = `AI ROCKET PLATFORM - COMPLETE FEATURE GUIDE:

=== CORE FEATURES (ACTIVE) ===

`;

  let featureNum = 1;
  for (const feature of coreFeatures) {
    output += `${featureNum}. ${feature.title.toUpperCase()}\n`;
    for (const point of feature.bulletPoints) {
      output += `   - ${point}\n`;
    }
    if (feature.impact) {
      output += `   Impact: ${feature.impact}\n`;
    }
    output += '\n';
    featureNum++;
  }

  output += `=== COMING SOON FEATURES ===

`;

  for (const feature of comingSoonFeatures) {
    output += `${featureNum}. ${feature.title.toUpperCase()}\n`;
    for (const point of feature.bulletPoints) {
      output += `    - ${point}\n`;
    }
    output += `    Status: ${feature.status}\n\n`;
    featureNum++;
  }

  return output;
}

function extractHowToGuides(mdContent) {
  const guides = [];
  const howToSection = mdContent.match(/## How-To Guides([\s\S]*?)(?=## |$)/i);

  if (!howToSection) return guides;

  const guideBlocks = howToSection[1].split(/### /);

  for (const block of guideBlocks) {
    if (!block.trim()) continue;

    const lines = block.trim().split('\n');
    const title = lines[0].trim();

    if (!title) continue;

    const steps = [];
    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (trimmed.match(/^\d+\./)) {
        steps.push(trimmed);
      } else if (trimmed.startsWith('- ')) {
        steps.push(trimmed.substring(2));
      }
    }

    guides.push({ title, steps });
  }

  return guides;
}

function buildHelpAssistantContext(coreFeatures, comingSoonFeatures, howToGuides) {
  let output = `AI ROCKET PLATFORM FEATURES AND CAPABILITIES:

`;

  let featureNum = 1;
  for (const feature of coreFeatures) {
    output += `${featureNum}. ${feature.title}\n`;
    for (const point of feature.bulletPoints) {
      output += `   - ${point}\n`;
    }
    output += '\n';
    featureNum++;
  }

  if (comingSoonFeatures.length > 0) {
    output += `COMING SOON:\n`;
    for (const feature of comingSoonFeatures) {
      output += `- ${feature.title}\n`;
    }
    output += '\n';
  }

  if (howToGuides.length > 0) {
    output += `HOW-TO GUIDES:\n\n`;
    for (const guide of howToGuides) {
      output += `${guide.title}:\n`;
      for (const step of guide.steps) {
        output += `  ${step}\n`;
      }
      output += '\n';
    }
  }

  return output;
}

function generateTypeScriptFile(platformCapabilities, navigationTargets, helpAssistantContext) {
  const tsContent = `// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated from AI_ROCKET_KEY_FEATURES.md during build
// Last updated: ${new Date().toISOString()}

export const PLATFORM_CAPABILITIES = \`${platformCapabilities.replace(/`/g, '\\`')}\`;

export const NAVIGATION_TARGETS = ${JSON.stringify(navigationTargets, null, 2)} as const;

export const HELP_ASSISTANT_FEATURES = \`${helpAssistantContext.replace(/`/g, '\\`')}\`;
`;

  const outputPath = path.join(__dirname, 'src', 'lib', 'generated-platform-knowledge.ts');
  fs.writeFileSync(outputPath, tsContent, 'utf-8');
  console.log('Generated src/lib/generated-platform-knowledge.ts');
}

syncPlatformKnowledge();
