import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const REGION = process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1';
const ACCESS_KEY = process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID || '';
const SECRET_KEY = process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY || '';
const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';

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

export async function getParkInfo(parkName: string): Promise<ParkInfo> {
  if (!isConfigured()) {
    return getMockParkInfo(parkName);
  }

  const client = new BedrockRuntimeClient({
    region: REGION,
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
  });

  const prompt = `You are a California State Parks ranger assistant. Provide concise visitor information for "${parkName}" in JSON format with these exact fields:
{
  "description": "2-sentence park description",
  "hours": "operating hours",
  "fees": "entry fees",
  "thingsToDo": ["activity 1", "activity 2", "activity 3"],
  "safetyTips": ["tip 1", "tip 2"],
  "wildlife": "notable wildlife to watch for",
  "bestSeason": "best time of year to visit"
}
Respond with valid JSON only, no markdown.`;

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    body: new TextEncoder().encode(body),
    contentType: 'application/json',
    accept: 'application/json',
  });

  const response = await client.send(command);
  const text = JSON.parse(new TextDecoder().decode(response.body));
  const content = text.content[0].text;

  try {
    return JSON.parse(content) as ParkInfo;
  } catch {
    return getMockParkInfo(parkName);
  }
}

export function getBedrockDebugInfo(): string {
  return `Region: ${REGION} | Key set: ${ACCESS_KEY.length > 0} | Secret set: ${SECRET_KEY.length > 0}`;
}

function getMockParkInfo(parkName: string): ParkInfo {
  return {
    description: `${parkName} is a beautiful California State Park offering stunning natural scenery and diverse outdoor recreation opportunities. Connect AWS Bedrock credentials to get real AI-powered park information.`,
    hours: 'Generally 8 AM – sunset (varies by season)',
    fees: '$8–$15 per vehicle (check park website for current rates)',
    thingsToDo: ['Hiking on scenic trails', 'Wildlife watching', 'Photography', 'Picnicking'],
    safetyTips: ['Carry at least 2L of water per person', 'Stay on marked trails', 'Check weather before visiting'],
    wildlife: 'Deer, birds of prey, and local native species',
    bestSeason: 'Spring and Fall for mild weather and fewer crowds',
  };
}
