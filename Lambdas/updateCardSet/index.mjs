import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,PUT"
      },
      body: JSON.stringify({ message: "CORS preflight OK" })
    };
  }

  // TinyMCE Cleanup Function
  function cleanPostBody(html) {
    if (!html) return html;

    return html
      // Remove <p>&nbsp;</p> and variants
      .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
      // Remove empty paragraphs with only whitespace
      .replace(/<p>\s*<\/p>/gi, '')
      // Remove multiple consecutive empty lines
      .replace(/\n{2,}/g, '\n')
      .trim();
  }


  // Parse JSON body for proxy integration
  let payload = event;
  if (event.body) {
    try {
      payload = JSON.parse(event.body);
    } catch (e) {
      console.log("Body parse error:", e);
    }
  }
  // Clean TinyMCE junk BEFORE saving
if (payload.postBody) {
  payload.postBody = cleanPostBody(payload.postBody);
}

  try {
    const {
      blogStatus,
      seoPageTitle,
      seoMetaDesc,
      seoURLSlug,
      seoTags,
      author,
      setName,
      mfg,
      size,
      subsets,
      stars,
      formats,
      headerImgName,
      footerImgName,
      year
    } = payload;


    const parsedYear = parseInt(year);

    if (!setName || isNaN(parsedYear)) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,PUT"
        },
        body: JSON.stringify({ error: "Missing or invalid setName/year" })
      };
    }

    const command = new UpdateCommand({
      TableName: "Cards",
      Key: {
        setName,
        year: parsedYear
      },
      UpdateExpression: `
        set blogStatus = :bs,
        seoPageTitle = :pt,
        seoMetaDesc = :md,
        seoURLSlug = :us,
        seoTags = :st,
        author = :ba,
            postBody = :pb,
            mfg = :mfg,
            size = :sz,
            subsets = :subs,
            stars = :stz,
            formats = :fmt,
            headerImgName = :hi,
            footerImgName = :fi
      `,
      ExpressionAttributeValues: {
        ":bs": blogStatus,
        ":pt": seoPageTitle,
        ":md": seoMetaDesc,
        ":us": seoURLSlug,
        ":st": seoTags,
        ":ba": author,
        ":pb": payload.postBody,
        ":mfg": mfg,
        ":sz": size,
        ":subs": subsets,
        ":stz": stars,
        ":fmt": formats,
        ":hi": headerImgName,
        ":fi": footerImgName
      }
    });

    await docClient.send(command);

    const message =
      blogStatus === "OK"
        ? "Your post was successfully updated. Have a badass day!"
        : "Your set was STAGED successfully. Have a badass day!";

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,PUT"
      },
      body: JSON.stringify({ message })
    };

  } catch (err) {
    console.error("UPDATE ERROR:", err);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,PUT"
      },
      body: JSON.stringify({
        error: "Failed to update card set",
        details: err.message
      })
    };
  }
};
