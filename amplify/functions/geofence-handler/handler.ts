import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({ region: "us-west-2" });

export const handler = async (event: any) => {
  const parkName = event.detail.GeofenceId;
  const kbId = "CVG6L7VSH0";

  const command = new RetrieveAndGenerateCommand({
    input: { text: `What are the specific safety warnings for hikers in ${parkName}?` },
    retrieveAndGenerateConfiguration: {
      type: "KNOWLEDGE_BASE",
      knowledgeBaseConfiguration: {
        knowledgeBaseId: kbId,
        modelArn: "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
      }
    }
  });

  const response = await client.send(command);
  return response.output?.text;
};