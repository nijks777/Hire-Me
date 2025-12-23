import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
        // For PDF, use pdf-parse to extract text
        console.log('Loading pdf-parse module...');
        const pdfParse = (await import('pdf-parse')) as any;
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

    // Now parse the resume text using Claude
    const parseResponse = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are an expert resume parser. Extract the following information from this resume and return it as a JSON object. Only extract information that is explicitly present in the resume. Use null for fields that are not found.

Resume Text:
${resumeText}

Extract and return ONLY a valid JSON object with these fields:
{
  "phoneNumber": string or null,
  "country": string (2-letter country code like "US", "IN", etc.) or null,
  "location": string (city, state/region) or null,
  "linkedinUrl": string or null,
  "portfolioUrl": string or null,
  "githubUrl": string or null,
  "currentJobTitle": string or null,
  "yearsOfExperience": number or null,
  "professionalSummary": string or null,
  "highestDegree": string or null,
  "fieldOfStudy": string or null,
  "university": string or null,
  "graduationYear": number or null,
  "workExperience": string (formatted as a list of roles and companies) or null,
  "technicalSkills": string (comma-separated list) or null,
  "softSkills": string (comma-separated list) or null,
  "certifications": string (comma-separated list) or null,
  "keyAchievements": string (newline-separated list of achievements) or null,
  "notableProjects": string (newline-separated list of projects with brief descriptions) or null,
  "targetRoles": string (comma-separated) or null,
  "industriesOfInterest": string (comma-separated) or null,
  "workPreference": string ("remote", "on-site", "hybrid") or null,
  "currency": string (3-letter code like "USD", "INR") or null,
  "salaryExpectation": string or null,
  "languagesSpoken": string (comma-separated) or null,
  "availability": string or null,
  "noticePeriod": string or null
}

Return ONLY the JSON object, no additional text or explanation.`,
        },
      ],
    });

    const parsedContent = parseResponse.content[0].type === 'text' ? parseResponse.content[0].text : '{}';

    // Extract JSON from the response (in case Claude adds any extra text)
    let jsonMatch = parsedContent.match(/\{[\s\S]*\}/);
    let profileData;

    if (jsonMatch) {
      profileData = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback if no JSON found
      profileData = JSON.parse(parsedContent);
    }

    // Clean up the data - remove null values
    const cleanedProfile: any = {};
    for (const [key, value] of Object.entries(profileData)) {
      if (value !== null && value !== undefined && value !== '') {
        cleanedProfile[key] = value;
      }
    }

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
