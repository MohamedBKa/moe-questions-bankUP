import AWS from "aws-sdk";

const sns = new AWS.SNS();

export async function handler(event: APIGatewayProxyEvent ) {
  const topicArn = process.env.TOPIC_ARN;
  console.log(topicArn);
  const data = JSON.parse(event.body);
  try {
    const response = await sns
      .publish({
        TopicArn: topicArn,
        Message: data.message,
        Subject: "Problem with exam system!!",
      })
      .promise();
    console.log("Message sent:", response);
    return {
      statusCode: 200,
      body: "Message sent successfully!",
    };
  } catch (error) {
    console.error("Error sending message:", error);
    return {
      statusCode: 500,
      body: "Failed to send message!",
    };
  }
}
