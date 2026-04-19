import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from '@aws-sdk/client-bedrock-agent-runtime';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const REGION = process.env.EXPO_PUBLIC_AWS_REGION || 'us-west-2';
const ACCESS_KEY = process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID || '';
const SECRET_KEY = process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY || '';
const KNOWLEDGE_BASE_ID = '5DXKVCM8JD';
const MODEL_ARN = `arn:aws:bedrock:${REGION}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`;

export interface ParkInfo {
  description: string;
  hours: string;
  fees: string;
  thingsToDo: string[];
  safetyTips: string[];
  wildlife: string;
  bestSeason: string;
}

function isConfigured(): boolean {
  return ACCESS_KEY.length > 0 && SECRET_KEY.length > 0;
}

function credentials() {
  return { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY };
}

export async function getParkInfo(parkName: string): Promise<ParkInfo> {
  if (!isConfigured()) {
    return getMockParkInfo(parkName);
  }

  try {
    // Step 1: retrieve real content from Knowledge Base (crawled from parks.ca.gov)
    const agentClient = new BedrockAgentRuntimeClient({ region: REGION, credentials: credentials() });

    const query = `For ${parkName} California State Park, provide: hours of operation, entry fees, top activities, safety tips, notable wildlife, and best season to visit.`;

    const ragCommand = new RetrieveAndGenerateCommand({
      input: { text: query },
      retrieveAndGenerateConfiguration: {
        type: 'KNOWLEDGE_BASE',
        knowledgeBaseConfiguration: {
          knowledgeBaseId: KNOWLEDGE_BASE_ID,
          modelArn: MODEL_ARN,
          generationConfiguration: {
            promptTemplate: {
              textPromptTemplate: `You are a California State Parks ranger assistant. Using only the retrieved context below, extract visitor information for ${parkName} and respond in this exact JSON format with no markdown:
{
  "description": "2-sentence description from the official park page",
  "hours": "operating hours from the official page",
  "fees": "entry fees from the official page",
  "thingsToDo": ["activity 1", "activity 2", "activity 3"],
  "safetyTips": ["tip 1", "tip 2"],
  "wildlife": "notable wildlife mentioned on the page",
  "bestSeason": "best time to visit"
}

$search_results$`,
            },
          },
        },
      },
    });

    const ragResponse = await agentClient.send(ragCommand);
    const rawText = ragResponse.output?.text || '';

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ParkInfo;
      }
    } catch {
      // KB returned something but not JSON — fall through to direct Claude call
    }

    // Step 2: fallback — ask Claude directly if KB had no relevant content
    return await getFromClaude(parkName);

  } catch (err) {
    console.error('[Bedrock KB] Error:', err);
    // If KB fails entirely, fall back to direct Claude
    try {
      return await getFromClaude(parkName);
    } catch {
      return getMockParkInfo(parkName);
    }
  }
}

async function getFromClaude(parkName: string): Promise<ParkInfo> {
  const client = new BedrockRuntimeClient({ region: REGION, credentials: credentials() });

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `You are a California State Parks ranger assistant. Provide accurate visitor information for "${parkName}" in this exact JSON format with no markdown:
{
  "description": "2-sentence park description",
  "hours": "operating hours",
  "fees": "entry fees",
  "thingsToDo": ["activity 1", "activity 2", "activity 3"],
  "safetyTips": ["tip 1", "tip 2"],
  "wildlife": "notable wildlife to watch for",
  "bestSeason": "best time of year to visit"
}`,
    }],
  });

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    body: new TextEncoder().encode(body),
    contentType: 'application/json',
    accept: 'application/json',
  });

  const response = await client.send(command);
  const text = JSON.parse(new TextDecoder().decode(response.body));
  return JSON.parse(text.content[0].text) as ParkInfo;
}

export function getBedrockDebugInfo(): string {
  return `Region: ${REGION} | Key set: ${ACCESS_KEY.length > 0} | KB: ${KNOWLEDGE_BASE_ID}`;
}

function getMockParkInfo(parkName: string): ParkInfo {
  return {
    description: `${parkName} is a beautiful California State Park. Add AWS credentials to .env.local to load real park data.`,
    hours: 'Generally 8 AM – sunset (varies by season)',
    fees: '$8–$15 per vehicle (check park website for current rates)',
    thingsToDo: ['Hiking on scenic trails', 'Wildlife watching', 'Photography', 'Picnicking'],
    safetyTips: ['Carry at least 2L of water per person', 'Stay on marked trails'],
    wildlife: 'Deer, birds of prey, and local native species',
    bestSeason: 'Spring and Fall for mild weather and fewer crowds',
  };
}
