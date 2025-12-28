import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || typeof decoded === 'string') {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { resumeContent, mimeType } = body;

    if (!resumeContent) {
      return NextResponse.json(
        { message: 'Resume content is required' },
        { status: 400 }
      );
    }

    // Decode base64 content
    const resumeBuffer = Buffer.from(resumeContent, 'base64');
    let resumeText = '';

    console.log('Parsing resume with mime type:', mimeType);

    // Convert to text based on mime type
    if (mimeType === 'application/pdf') {
      try {
        // For PDF, use pdf-parse Node.js version
        console.log('Loading pdf-parse/node module...');
        // @ts-ignore - pdf-parse has ESM export issues with TypeScript
        const { default: pdfParse } = await import('pdf-parse/node');
        console.log('Parsing PDF buffer...');
        const pdfData = await pdfParse(resumeBuffer);
        resumeText = pdfData.text;
        console.log('PDF parsed successfully, text length:', resumeText.length);
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        throw new Error(`Failed to parse PDF: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`);
      }
    } else {
      // For text documents
      resumeText = resumeBuffer.toString('utf-8');
      console.log('Text document parsed, length:', resumeText.length);
    }

    // Parse resume using pattern matching (no AI needed!)
    const profileData = parseResumeText(resumeText);

    // Clean up the data - remove null values
    const cleanedProfile: any = {};
    for (const [key, value] of Object.entries(profileData)) {
      if (value !== null && value !== undefined && value !== '') {
        cleanedProfile[key] = value;
      }
    }

    console.log('Extracted fields:', Object.keys(cleanedProfile).length);

    return NextResponse.json({
      success: true,
      profile: cleanedProfile,
    });
  } catch (error) {
    console.error('Error parsing resume:', error);
    return NextResponse.json(
      {
        message: 'Failed to parse resume',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Pattern-based resume parser - extracts structured data without AI
 * This approach is faster, cheaper, and more reliable than LLM parsing
 */
function parseResumeText(text: string): any {
  const profile: any = {};

  // Email extraction
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/i);
  if (emailMatch) {
    // We don't store email in profile, but we found it
  }

  // Phone number extraction (various formats)
  const phonePatterns = [
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /(\+?\d{1,3}[-.\s]?)?\d{10}/,
  ];
  for (const pattern of phonePatterns) {
    const phoneMatch = text.match(pattern);
    if (phoneMatch) {
      profile.phoneNumber = phoneMatch[0].trim();
      break;
    }
  }

  // LinkedIn URL
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) {
    profile.linkedinUrl = linkedinMatch[0].includes('http')
      ? linkedinMatch[0]
      : `https://${linkedinMatch[0]}`;
  }

  // GitHub URL
  const githubMatch = text.match(/github\.com\/[\w-]+/i);
  if (githubMatch) {
    profile.githubUrl = githubMatch[0].includes('http')
      ? githubMatch[0]
      : `https://${githubMatch[0]}`;
  }

  // Portfolio/Website URL
  const websiteMatch = text.match(/(?:portfolio|website|site)[\s:]+([^\s,]+\.[a-z]{2,})/i);
  if (websiteMatch) {
    profile.portfolioUrl = websiteMatch[1].includes('http')
      ? websiteMatch[1]
      : `https://${websiteMatch[1]}`;
  }

  // Location extraction (City, State/Country patterns)
  const locationPatterns = [
    /(?:Location|Address|Based in)[\s:]+([A-Z][a-z]+(?:,?\s+[A-Z]{2})?(?:,?\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+,\s*[A-Z]{2}(?:,?\s*[A-Z][a-z]+)?)/,
  ];
  for (const pattern of locationPatterns) {
    const locationMatch = text.match(pattern);
    if (locationMatch) {
      profile.location = locationMatch[1].trim();
      // Extract country code if possible
      const countryMatch = profile.location.match(/,\s*([A-Z]{2})$/);
      if (countryMatch) {
        profile.country = countryMatch[1];
      }
      break;
    }
  }

  // Years of experience
  const expMatch = text.match(/(\d+)[\s+-]+years?\s+(?:of\s+)?experience/i);
  if (expMatch) {
    profile.yearsOfExperience = parseInt(expMatch[1]);
  }

  // Education - Degree extraction
  const degreePatterns = [
    /(Bachelor|Master|PhD|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?)(?:\s+(?:of|in|degree))?(?:\s+([A-Za-z\s]+))?/i,
  ];
  for (const pattern of degreePatterns) {
    const degreeMatch = text.match(pattern);
    if (degreeMatch) {
      profile.highestDegree = degreeMatch[0].trim();
      if (degreeMatch[2]) {
        profile.fieldOfStudy = degreeMatch[2].trim();
      }
      break;
    }
  }

  // University
  const uniMatch = text.match(/(?:University|College|Institute)\s+(?:of\s+)?([A-Za-z\s]+)/i);
  if (uniMatch) {
    profile.university = uniMatch[0].trim();
  }

  // Graduation Year
  const gradMatch = text.match(/(?:Graduated|Graduation|Class of)[\s:]+(\d{4})/i) ||
                     text.match(/(\d{4})\s*-\s*(?:Present|Current)/i);
  if (gradMatch) {
    profile.graduationYear = parseInt(gradMatch[1]);
  }

  // Job titles (look for common patterns)
  const jobTitlePatterns = [
    /(Senior|Junior|Lead|Principal|Staff)?\s*(Software|Web|Full[- ]?Stack|Frontend|Backend|DevOps|Data|ML|AI)\s+(Engineer|Developer|Architect|Scientist)/i,
    /(Product|Project|Engineering|Technical)\s+Manager/i,
  ];
  for (const pattern of jobTitlePatterns) {
    const titleMatch = text.match(pattern);
    if (titleMatch) {
      profile.currentJobTitle = titleMatch[0].trim();
      break;
    }
  }

  // Technical Skills - look for skills section
  const skillsSectionMatch = text.match(/(?:Technical\s+)?Skills[\s:]+([^\n]{20,})/i);
  if (skillsSectionMatch) {
    profile.technicalSkills = skillsSectionMatch[1]
      .split(/[,;|]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .join(', ');
  } else {
    // Try to find common technologies
    const techKeywords = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C\\+\\+', 'React', 'Node\\.js',
      'Angular', 'Vue', 'AWS', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'Git'
    ];
    const foundSkills: string[] = [];
    techKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(text)) {
        foundSkills.push(keyword.replace(/\\/g, ''));
      }
    });
    if (foundSkills.length > 0) {
      profile.technicalSkills = foundSkills.join(', ');
    }
  }

  // Certifications
  const certMatch = text.match(/Certifications?[\s:]+([^\n]+)/i);
  if (certMatch) {
    profile.certifications = certMatch[1].trim();
  }

  // Languages spoken
  const langMatch = text.match(/Languages?[\s:]+([A-Za-z,\s]+)/i);
  if (langMatch) {
    profile.languagesSpoken = langMatch[1].trim();
  }

  // Extract summary/objective
  const summaryMatch = text.match(/(?:Summary|Objective|Profile)[\s:]+([^\n]{50,200})/i);
  if (summaryMatch) {
    profile.professionalSummary = summaryMatch[1].trim();
  }

  return profile;
}
