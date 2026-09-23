import dotenv from 'dotenv';
dotenv.config();

const FOUNDRY_PROJECT_ENDPOINT = process.env.FOUNDRY_PROJECT_ENDPOINT;
const FOUNDRY_AGENT_NAME = process.env.FOUNDRY_AGENT_NAME || 'CampusPlacementAgent';
const FOUNDRY_MODEL = 'gpt-4.1-mini';

export interface AgentResponse {
  content: string;
}

export interface StudentProfileContext {
  fullName?: string;
  university?: string;
  degree?: string;
  branch?: string;
  graduationYear?: number;
  cgpa?: number;
  backlogs?: number;
  preferredRole?: string;
  targetCompany?: string;
  skills?: string[];
  projects?: Array<{ name: string; description?: string; technologies?: string }>;
  certifications?: Array<{ name: string; issuer?: string; year?: number }>;
  resumeText?: string;
}

function buildProfileSummary(profile: StudentProfileContext): string {
  const lines: string[] = ['=== STUDENT PROFILE ==='];
  if (profile.fullName) lines.push(`Name: ${profile.fullName}`);
  if (profile.university) lines.push(`University: ${profile.university}`);
  if (profile.degree) lines.push(`Degree: ${profile.degree}`);
  if (profile.branch) lines.push(`Branch: ${profile.branch}`);
  if (profile.graduationYear) lines.push(`Graduation Year: ${profile.graduationYear}`);
  if (profile.cgpa !== undefined && profile.cgpa !== null) lines.push(`CGPA: ${profile.cgpa}`);
  if (profile.backlogs !== undefined && profile.backlogs !== null) lines.push(`Backlogs: ${profile.backlogs}`);
  if (profile.preferredRole) lines.push(`Preferred Role: ${profile.preferredRole}`);
  if (profile.targetCompany) lines.push(`Target Company: ${profile.targetCompany}`);
  if (profile.skills && profile.skills.length > 0) {
    lines.push(`Skills: ${profile.skills.join(', ')}`);
  }
  if (profile.projects && profile.projects.length > 0) {
    lines.push('\nProjects:');
    profile.projects.forEach(p => {
      lines.push(`- ${p.name}${p.technologies ? ` (${p.technologies})` : ''}${p.description ? `: ${p.description}` : ''}`);
    });
  }
  if (profile.certifications && profile.certifications.length > 0) {
    lines.push('\nCertifications:');
    profile.certifications.forEach(c => {
      lines.push(`- ${c.name}${c.issuer ? ` by ${c.issuer}` : ''}${c.year ? ` (${c.year})` : ''}`);
    });
  }
  if (profile.resumeText) {
    lines.push('\n=== RESUME CONTENT ===');
    lines.push(profile.resumeText.substring(0, 3000));
  }
  return lines.join('\n');
}

export async function sendToAzureAgent(
  userMessage: string,
  profile?: StudentProfileContext,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<AgentResponse> {
  if (!FOUNDRY_PROJECT_ENDPOINT) {
    throw new Error(
      'Azure AI Foundry endpoint not configured. Please set FOUNDRY_PROJECT_ENDPOINT in your .env file.'
    );
  }

  try {
    const { AIProjectClient } = await import('@azure/ai-projects');
    const { DefaultAzureCredential } = await import('@azure/identity');

    const projectClient = new AIProjectClient(
      FOUNDRY_PROJECT_ENDPOINT,
      new DefaultAzureCredential()
    );

    const openai = projectClient.getOpenAIClient({
      azureConfig: {
        agentName: FOUNDRY_AGENT_NAME,
        allowPreview: true,
      },
    });

    // Build the full input message with profile context
    let fullInput = userMessage;

    if (profile) {
      const profileSummary = buildProfileSummary(profile);
      fullInput = `${profileSummary}\n\n=== USER QUESTION ===\n${userMessage}`;
    }

    // Include conversation history as part of the input if provided
    let inputMessages: any = fullInput;
    if (conversationHistory && conversationHistory.length > 0) {
      const historyMessages = conversationHistory.slice(-6).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      historyMessages.push({ role: 'user', content: fullInput });
      inputMessages = historyMessages;
    }

    const response = await (openai as any).responses.create({
      model: FOUNDRY_MODEL,
      input: inputMessages,
    });

    const responseText = response.output_text;

    if (!responseText) {
      throw new Error('No response received from the agent.');
    }

    return { content: responseText };
  } catch (error) {
    const err = error as any;
    console.error('Azure AI Foundry error:', err.message || err);
    throw new Error(`Azure AI Foundry service error: ${err.message || 'Unknown error'}`);
  }
}

export async function runEligibilityAnalysis(
  profile: StudentProfileContext,
  targetCompany: string,
  targetRole: string
): Promise<AgentResponse> {
  const message = `
Please perform a detailed eligibility analysis for the following:

Target Company: ${targetCompany}
Target Role: ${targetRole}

Use the student profile provided above.

IMPORTANT INSTRUCTIONS:
1. For each requirement, classify it as exactly one of:
   - "SATISFIED": The student clearly meets this requirement based on provided information.
   - "INFORMATION_MISSING": The student has not provided information about this requirement — do NOT assume they lack it.
   - "CONFIRMED_GAP": Based on available information, there is a clear, confirmed skill or qualification gap.

2. NEVER treat missing information as a skill gap.
3. Do NOT guarantee placement selection.
4. Provide:
   - Overall eligibility status
   - Satisfied requirements list
   - Missing information list
   - Confirmed skill gaps list
   - Detailed explanation
   - Recommendations

Format your response clearly with these sections.
`;

  return sendToAzureAgent(message, profile);
}

export async function runSkillGapAnalysis(
  profile: StudentProfileContext,
  targetCompany: string,
  targetRole: string
): Promise<AgentResponse> {
  const message = `
Please perform a detailed skill gap analysis for the following:

Target Company: ${targetCompany}
Target Role: ${targetRole}

Use the student profile provided above.

IMPORTANT INSTRUCTIONS:
1. List ALL skills typically required for this role and company.
2. For each required skill, indicate:
   - "SATISFIED": Student has demonstrated this skill.
   - "INFORMATION_MISSING": Student hasn't mentioned this skill — cannot confirm absence.
   - "CONFIRMED_GAP": Based on available info, student clearly lacks this skill.
3. NEVER classify unknown/unmentioned skills as confirmed gaps.
4. For confirmed gaps only, provide:
   - Why the skill matters for this role
   - Recommended learning direction/resources
5. Provide an overall skill readiness assessment.

Format response with clear sections: Required Skills, Satisfied, Missing Information, Confirmed Skill Gaps.
`;

  return sendToAzureAgent(message, profile);
}

export async function runPreparationPlan(
  profile: StudentProfileContext,
  targetCompany: string,
  targetRole: string
): Promise<AgentResponse> {
  const message = `
Please generate a personalized placement preparation plan for the following:

Target Company: ${targetCompany}
Target Role: ${targetRole}

Use the student profile provided above.

Create a structured preparation plan with phases using Roman numerals:
PHASE I: Foundation
PHASE II: Core Skills Development
PHASE III: Role-Specific Preparation
PHASE IV: Interview Preparation
PHASE V: Final Readiness

For each phase:
- List specific tasks and topics
- Provide time estimates
- Prioritize based on confirmed gaps (not missing information)
- Include resources/directions

Do NOT fabricate preparation items for skills the student already has.
Focus preparation on confirmed gaps and role-specific requirements.
`;

  return sendToAzureAgent(message, profile);
}
