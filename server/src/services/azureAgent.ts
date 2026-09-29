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
  conversationHistory?: Array<{ role: string; content: string }>,
  preferredLanguage?: string
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

    // Build language instruction — strict version that forbids English words entirely
    const langInstruction = preferredLanguage && preferredLanguage !== 'auto'
      ? `CRITICAL LANGUAGE INSTRUCTION — STRICTLY FOLLOW THESE RULES:
1. You MUST respond ENTIRELY in ${preferredLanguage}. Every single word must be in ${preferredLanguage} script.
2. ABSOLUTELY NO English words or Latin script anywhere in your response.
3. Technical terms (like CGPA, backlog, skills, placement, interview, resume, company, role, etc.) — transliterate them PHONETICALLY into the ${preferredLanguage} script. Do NOT write them in English letters.
4. Acronyms like CGPA, AI, ML, TCS, WIPRO — write them phonetically in ${preferredLanguage} script.
5. Numbers: use Arabic numerals (0-9) only. All surrounding words must still be in ${preferredLanguage}.
6. If you cannot find a ${preferredLanguage} word, STILL write it phonetically in ${preferredLanguage} — NEVER fall back to English.
7. A person who only reads ${preferredLanguage} and cannot read English must be able to read your ENTIRE response.
8. Violating these rules is UNACCEPTABLE. Re-read your response and replace every English word before outputting.

`
      : `LANGUAGE INSTRUCTION: Detect the language of the user's message and respond in that EXACT same language and script. If the user writes in Telugu, respond fully in Telugu. If in Hindi, respond fully in Hindi. Do NOT mix languages or use English words unnecessarily.\n\n`;

    let fullInput = userMessage;

    if (profile) {
      const profileSummary = buildProfileSummary(profile);
      fullInput = `${langInstruction}${profileSummary}\n\n=== USER QUESTION ===\n${userMessage}`;
    } else {
      fullInput = `${langInstruction}=== USER QUESTION ===\n${userMessage}`;
    }

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

/**
 * Generate a natural, speech-friendly presentation/audio script for the student.
 * Uses the existing CampusPlacementAgent — no new Azure resource required.
 *
 * Agent role for this call:
 * "You are the Campus Placement AI Audio and Presentation Script Agent.
 *  Generate accurate, natural, speech-friendly scripts based ONLY on the
 *  provided student profile. Never invent capabilities, metrics, or claims."
 */
export async function generatePresentationScript(
  profile: StudentProfileContext,
  language: string = 'English',
  languageCode: string = 'en'
): Promise<AgentResponse> {
  const isEnglish = languageCode === 'en' || language.toLowerCase() === 'english';

  const langRule = isEnglish
    ? ''
    : `
IMPORTANT LANGUAGE RULE:
You MUST write this script ENTIRELY in ${language}.
Every word must be in ${language} — NO English words.
Transliterate technical terms (Azure, CGPA, placement, skills, etc.) phonetically into ${language} script.
Do NOT use any Latin/English characters.
`;

  const profileSummary = buildProfileSummary(profile);

  const message = `
You are the Campus Placement AI Audio and Presentation Script Agent.

Your task is to generate a natural, speech-friendly 60-90 second presentation script
for the following student, describing their placement journey using Campus Placement AI.
${langRule}
STRICT RULES:
1. Use ONLY the information provided in the student profile below.
2. Do NOT invent achievements, metrics, percentages, awards, or technologies not mentioned.
3. Do NOT invent Azure resources, project capabilities, or team members.
4. Write in natural spoken language — as if someone is speaking aloud.
5. Do NOT include markdown, bullet points, stage directions, asterisks, or formatting.
6. Do NOT include phrases like "[Pause]" or "[Music]".
7. Output ONLY the clean spoken text — nothing else.
8. Keep technical product names accurate: Azure AI Foundry, GPT-4.1-mini, Campus Placement AI.
9. The script should cover: who the student is, their target role/company, and how
   Campus Placement AI helped them with eligibility analysis, skill gap analysis,
   and preparation planning.
10. If profile data is missing for a field, do NOT make up a value — skip that field naturally.

${profileSummary}

Generate the presentation script now.
`;

  return sendToAzureAgent(message, undefined, undefined, isEnglish ? undefined : language);
}

/**
 * Resume Intelligence Analysis
 * Uses the existing CampusPlacementAgent + RAG (Azure AI Search grounded knowledge).
 * No separate agent or Azure resource required.
 *
 * Scoring methodology (documented):
 *   The AI is instructed to produce a structured compatibility assessment
 *   across five weighted dimensions:
 *     - Required Skill Coverage       (30%)
 *     - Job / Role Requirement Match  (25%)
 *     - Project Relevance             (20%)
 *     - Education / Qualification     (15%)
 *     - Resume Structure              (10%)
 *   The AI derives each dimension from the actual resume text and profile.
 *   The overall score is the weighted sum rounded to the nearest integer.
 *   Same resume + same target → same score (deterministic given fixed temperature).
 */
export async function runResumeIntelligence(
  profile: StudentProfileContext,
  targetCompany: string,
  targetRole: string,
  resumeText: string
): Promise<AgentResponse> {

  const profileSummary = buildProfileSummary(profile);

  const message = `
You are the Campus Placement AI — Resume Intelligence Analyst.

Your task is to perform a COMPREHENSIVE, EVIDENCE-BASED resume intelligence analysis.

TARGET:
Company: ${targetCompany}
Role: ${targetRole}

RESUME CONTENT (full text extracted from the uploaded resume):
---
${resumeText.substring(0, 4000)}
---

STUDENT PROFILE (from the application database):
${profileSummary}

=== STRICT ANALYSIS RULES ===

1. BASE ALL ANALYSIS ON ACTUAL RESUME TEXT AND PROFILE DATA ABOVE.
2. DO NOT INVENT skills, projects, experience, certifications, metrics, or achievements.
3. For each requirement, classify using EXACTLY these three terms:
   - SATISFIED: Resume/profile contains clear evidence.
   - INFORMATION_MISSING: Not mentioned — do NOT assume absence = gap.
   - CONFIRMED_GAP: Profile or resume clearly indicates deficiency.
4. NEVER encourage fabricating skills, experience, or achievements.
5. If a rewrite suggestion is made, it must be based ONLY on existing resume evidence.
6. The Compatibility Score must be CALCULATED from the five dimensions below — not random.
7. Do NOT claim this is an official ATS score.

=== SCORING METHODOLOGY (follow exactly) ===

Calculate five dimension scores (0-100) based on the resume evidence:
  A. Required Skill Coverage (weight 30%): What % of role-required skills have evidence?
  B. Job Requirement Match (weight 25%): How well does the resume address role responsibilities?
  C. Project Relevance (weight 20%): Are the resume projects relevant to the target role?
  D. Education Alignment (weight 15%): Does education meet role requirements?
  E. Resume Structure (weight 10%): Are standard sections present and well-structured?

Overall Score = round(A*0.30 + B*0.25 + C*0.20 + D*0.15 + E*0.10)

=== OUTPUT FORMAT (use exactly these section headers) ===

## RESUME COMPATIBILITY SCORE
[Overall score]/100
[One-line rationale]

## SCORE BREAKDOWN
Required Skill Coverage: [A]/100 (weight: 30%)
Job Requirement Match: [B]/100 (weight: 25%)
Project Relevance: [C]/100 (weight: 20%)
Education Alignment: [D]/100 (weight: 15%)
Resume Structure: [E]/100 (weight: 10%)

## WHY THIS SCORE
[3-5 bullet points explaining the score — positive factors and detractors]

## REQUIRED SKILLS ANALYSIS
For each skill/requirement important for this role, list:
SKILL_NAME | STATUS: SATISFIED/INFORMATION_MISSING/CONFIRMED_GAP | EVIDENCE: [where found or "not found"]

## RESUME SECTION ANALYSIS
For each section: Contact / Summary / Education / Skills / Experience / Projects / Certifications
STATUS: PRESENT/MISSING/WEAK | NOTES: [brief note]

## PROJECT RELEVANCE
For each project found in the resume:
PROJECT: [name]
RELEVANCE: HIGH/MEDIUM/LOW
EVIDENCE: [relevant technologies/skills demonstrated]
IMPROVEMENT NOTE: [only if genuine improvement possible without fabrication]

## WHAT YOUR RESUME DOES WELL
[3-5 bullet points — genuine strengths from resume evidence]

## WHAT NEEDS IMPROVEMENT
[3-5 bullet points — specific weaknesses, no fabrication]

## RESUME IMPROVEMENT RECOMMENDATIONS
PRIORITY 1: [Title]
[Explanation — must be based on actual resume content]

PRIORITY 2: [Title]
[Explanation]

PRIORITY 3: [Title]
[Explanation]

## SAFE REWRITE SUGGESTIONS
For 2-3 weak bullet points from the resume, suggest improved wording.
CURRENT: "[exact quote from resume]"
SUGGESTED: "[improved version based only on existing evidence]"
NOTE: Only suggest improvements based on what is already in the resume.

## NEXT LEARNING PRIORITIES
Based on CONFIRMED_GAP skills only:
1. [Skill/topic]
2. [Skill/topic]
If no confirmed gaps, state: "No confirmed skill gaps identified from available evidence."

## ACTION PLAN BEFORE APPLYING
01. [Specific action]
02. [Specific action]
03. [Specific action]
04. [Specific action]
05. [Specific action]

## DISCLAIMER
This Resume Compatibility Score is an application-defined assessment based on the five dimensions above. It is NOT an official ATS score and does not guarantee interview selection, shortlisting, or placement. Every company uses its own internal criteria.
`;

  return sendToAzureAgent(message, undefined);
}
