import fs from 'fs';
import path from 'path';

export interface ExtractedResume {
  text: string;
  sections: {
    education: string[];
    skills: string[];
    projects: string[];
    experience: string[];
    certifications: string[];
  };
}

export async function extractTextFromResume(filePath: string, fileType: string): Promise<ExtractedResume> {
  const ext = path.extname(filePath).toLowerCase();
  let rawText = '';

  try {
    if (ext === '.pdf') {
      rawText = await extractFromPDF(filePath);
    } else if (ext === '.docx' || ext === '.doc') {
      rawText = await extractFromDOCX(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    const sections = parseResumeSection(rawText);
    return { text: rawText, sections };
  } catch (error) {
    console.error('Resume extraction error:', error);
    throw new Error(`Failed to extract text from resume: ${(error as Error).message}`);
  }
}

async function extractFromPDF(filePath: string): Promise<string> {
  // Dynamic import to handle pdf-parse
  const pdfParse = require('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text || '';
}

async function extractFromDOCX(filePath: string): Promise<string> {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || '';
}

function parseResumeSection(text: string): ExtractedResume['sections'] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const sections: ExtractedResume['sections'] = {
    education: [],
    skills: [],
    projects: [],
    experience: [],
    certifications: [],
  };

  let currentSection: keyof typeof sections | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (/education|academic|qualification/i.test(lower)) {
      currentSection = 'education';
    } else if (/skill|technology|technical|competenc/i.test(lower)) {
      currentSection = 'skills';
    } else if (/project/i.test(lower)) {
      currentSection = 'projects';
    } else if (/experience|work|employment|internship/i.test(lower)) {
      currentSection = 'experience';
    } else if (/certification|certificate|course|training/i.test(lower)) {
      currentSection = 'certifications';
    } else if (currentSection && line.length > 2) {
      sections[currentSection].push(line);
    }
  }

  return sections;
}
