// @ts-ignore
import sigV4Client from "./sigV4Client.js";
import { getCurrentUser } from "./getToken.ts";
import { getUserToken } from "./getToken.ts";
import getAwsCredentials from "./getIAMCred.ts";

// Invokes the API Gateway using the retrieved IAM credentials
const sigClient: any = sigV4Client;

export default async function invokeApig({
  path,
  method = "GET",
  headers = {},
  queryParams = {},
  body,
}: {
  path: string; // Correct type definition
  method?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string | number>;
  body: any;
}) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error("User is not authenticated");
  }

  const userToken = await getUserToken(currentUser); // User token from the Cognito user pool

  // Retrieve IAM credentials based on the Cognito token
  //@ts-ignore
  const credentials = await getAwsCredentials(userToken);

  //@ts-ignore
  const { accessKeyId, secretAccessKey, sessionToken } = credentials;

  if (!accessKeyId || !secretAccessKey || !sessionToken) {
    throw new Error("AWS credentials are not available.");
  }

  // sigV4 is needed as our API authorizer is IAM
  const client = sigClient.newClient({
    accessKey: accessKeyId,
    secretKey: secretAccessKey,
    sessionToken: sessionToken,
    region: import.meta.env.VITE_REGION,
    endpoint: import.meta.env.VITE_API_URL,
  });

  // Signs the request with the appropriate data
  const signedRequest = client.signRequest({
    method,
    path,
    headers,
    queryParams,
    body,
  });

  body = body ? JSON.stringify(body) : body;

  //Sends the signed request

  console.log("Request Payload:", { path, method, headers, queryParams, body });
  
  const results = await fetch(signedRequest.url, {
   method,
    headers: signedRequest.headers,
    body,
  });
  

  if (!results.ok) {
    const errorText = await results.text();
    console.error("Error response body:", errorText);
    throw new Error(`API call failed: ${errorText}`);
  }

  const textResponse = await results.text();
  try {
    return textResponse ? JSON.parse(textResponse) : null;
  } catch (error) {
    throw new Error(
      `Failed to parse response as JSON: ${(error as Error).message}`
    );
  }
}
