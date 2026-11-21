import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, QueryCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

// A Wax Museum pack: its 4-digit year, a hyphen, then its packKey slug (saveWaxPack's SLUG_PATTERN).
const WAX_PACK_PATTERN = /^\d{4}-[a-z0-9]+(-[a-z0-9]+)*$/;

// Optional fields (printRun, waxPack): a value SETs it, blank REMOVEs it, and a payload without the key
// (an older cached CMS script) leaves it alone, so a stale browser can't wipe a value it never showed.
// Returns the SET part, the REMOVE part (REMOVE may appear only once) and the values.
function optionalFieldClauses(payload, fields) {
  const sets = [], removes = [], values = {};
  for (const [field, token] of fields) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;
    const value = typeof payload[field] === "string" ? payload[field].trim() : "";
    if (value) { sets.push(`${field} = ${token}`); values[token] = value; } else { removes.push(field); }
  }
  return {
    setClause: sets.map((part) => `, ${part}`).join(""),
    removeClause: removes.length ? ` REMOVE ${removes.join(", ")}` : "",
    values
  };
}

// A live set's slug is its page address (/reviews/<slug>/), so two live sets
// can't share one - the site build would refuse. Returns the name of the live
// set (other than this one) already using the slug, or null.
async function liveSetUsingSlug(slug, setName, year) {
  let lastKey;
  do {
    const data = await docClient.send(new QueryCommand({
      TableName: "Cards",
      IndexName: "blogStatus-year-index",
      KeyConditionExpression: "blogStatus = :ok",
      ProjectionExpression: "setName, #yr, seoURLSlug",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: { ":ok": "OK" },
      ExclusiveStartKey: lastKey
    }));
    const other = data.Items.find((item) => item.seoURLSlug === slug && !(item.setName === setName && item.year === year));
    if (other) return other.setName;
    lastKey = data.LastEvaluatedKey;
  } while (lastKey);
  return null;
}

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

    // The slug is the review's public address (/reviews/<slug>/): required, URL-safe.
    if (typeof seoURLSlug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(seoURLSlug.trim())) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,PUT"
        },
        body: JSON.stringify({ error: "seoURLSlug is required: lowercase letters, numbers and single hyphens" })
      };
    }

    if (blogStatus === "OK") {
      const owner = await liveSetUsingSlug(seoURLSlug.trim(), setName, parsedYear);
      if (owner) {
        return {
          statusCode: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,PUT"
          },
          body: JSON.stringify({ error: `SEO Friendly URL "${seoURLSlug.trim()}" is already used by the live set "${owner}"` })
        };
      }
    }

    const waxPack = typeof payload.waxPack === "string" ? payload.waxPack.trim() : "";
    if (waxPack && !WAX_PACK_PATTERN.test(waxPack)) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS,PUT"
        },
        body: JSON.stringify({ error: "waxPack must be a pack's year and key, like 1990-o-pee-chee" })
      };
    }

    const optional = optionalFieldClauses(payload, [["printRun", ":pr"], ["waxPack", ":wp"]]);

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
        updatedAt = :ua,
        author = :ba,
            postBody = :pb,
            mfg = :mfg,
            size = :sz,
            subsets = :subs,
            stars = :stz,
            formats = :fmt,
            headerImgName = :hi,
            footerImgName = :fi${optional.setClause}${optional.removeClause}
      `,
      ExpressionAttributeValues: {
        ":bs": blogStatus,
        ":pt": seoPageTitle,
        ":md": seoMetaDesc,
        ":us": seoURLSlug,
        ":st": seoTags,
        ":ua": new Date().toISOString(),
        ":ba": author,
        ":pb": payload.postBody,
        ":mfg": mfg,
        ":sz": size,
        ":subs": subsets,
        ":stz": stars,
        ":fmt": formats,
        ":hi": headerImgName,
        ":fi": footerImgName,
        ...optional.values
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
