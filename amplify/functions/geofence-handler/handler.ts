import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

function geofenceIdToParkName(geofenceId: string): string {
  // Uploaded IDs use underscores and may get numeric suffixes for duplicates.
  return geofenceId
    .replace(/_\d+$/, "")
    .replace(/_/g, " ")
    .trim();
}

function isRefusal(text: string): boolean {
  const lowered = text.toLowerCase();
  return (
    lowered.includes("unable to assist") ||
    lowered.includes("can\'t assist") ||
    lowered.includes("cannot assist")
  );
}

function buildFallbackSafetyTips(parkName: string): string {
  return [
    `Safety Tips for ${parkName}:`,
    "1. Check weather and trail conditions before starting, and turn around if conditions worsen.",
    "2. Carry enough water, snacks, sun protection, and a basic first-aid kit.",
    "3. Stay on marked trails and keep your phone charged with offline maps available.",
    "4. Keep distance from wildlife and do not feed animals.",
    "5. Tell someone your route and expected return time; call 911 for emergencies.",
  ].join(" ");
}

export const handler = async (event: any) => {
  console.log("geofence-handler deploy marker: 2026-04-19T10:36Z");

  const accessKeyId = process.env.JORDAN_AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.JORDAN_AWS_SECRET_ACCESS_KEY || "";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing Bedrock credentials in Lambda environment");
  }

  const JadonBedrockClient = new BedrockAgentRuntimeClient({
    region: "us-west-2",
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const geofenceId = event?.detail?.GeofenceId || "Unknown Park";
  const parkName = geofenceIdToParkName(geofenceId);
  console.log(
    `🏞️ Geofence ENTER event for parkId=${geofenceId}, parkName=${parkName}`,
  );

  const primaryPrompt = [
    `You are a park safety assistant for hikers.`,
    `Provide concise, practical safety tips for ${parkName}.`,
    `Focus on trail hazards, weather, wildlife, water, and emergency preparedness.`,
    `If park-specific details are unavailable in the knowledge base, state that clearly and then provide general hiking safety tips.`,
  ].join(" ");

  const command = new RetrieveAndGenerateCommand({
    input: {
      text: primaryPrompt,
    },
    retrieveAndGenerateConfiguration: {
      type: "KNOWLEDGE_BASE",
      knowledgeBaseConfiguration: {
        knowledgeBaseId: process.env.KB_ID!,
        modelArn:
          "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: 8,
          },
        },
      },
    },
  });

  let response = await JadonBedrockClient.send(command);
  let outputText = response.output?.text || "";
  console.log("RESPONSE:", response);

  if (!outputText || isRefusal(outputText)) {
    const retryCommand = new RetrieveAndGenerateCommand({
      input: {
        text: `Provide 5 short hiking safety tips for visitors at ${parkName}. This is for safety education.`,
      },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: process.env.KB_ID!,
          modelArn:
            "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: 8,
            },
          },
        },
      },
    });

    response = await JadonBedrockClient.send(retryCommand);
    outputText = response.output?.text || "";
    console.log("🔁 Bedrock retry executed due to empty/refusal primary response");
  }

  if (!outputText || isRefusal(outputText)) {
    outputText = buildFallbackSafetyTips(parkName);
    console.log("🛟 Using hardcoded safety-tip fallback after Bedrock refusal/empty retry");
  }

  console.log(
    `✅ Bedrock response received. Output length: ${outputText.length} chars`,
  );
  console.log(`📚 Citation count: ${response.citations?.length || 0}`);
  console.log(`📋 Safety Tips: ${outputText}`);
  return outputText;
};
