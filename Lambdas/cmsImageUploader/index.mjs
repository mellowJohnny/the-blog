import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: "us-east-2" });
const BUCKET = "mellowjohnny.cc.files";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const fileName = body.fileName;
    const directory = body.directory; // "img/blog/" or "img/cards/"

    if (!fileName || !directory) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "fileName and directory are required" })
      };
    }

    const key = `${directory}${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: body.contentType || "image/webp",
      CacheControl: "public, max-age=31536000, immutable"
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({
        uploadUrl,
        finalUrl: `https://s3.us-east-2.amazonaws.com/${BUCKET}/${key}`
      })
    };

  } catch (err) {
    console.error("Upload URL error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate upload URL" })
    };
  }
};
