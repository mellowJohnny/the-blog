
/*
*  getBlogs Lambda Function
*  Fetches blog posts filtered using "type" param
*/

// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');

// Set the region
AWS.config.update({region: 'us-east-2'});

exports.handler = async (event, context) => {
  
  // Get the setID parameter...
  // Declare the parameter
 // let setID;
  // Check for a not null value and only set it if not null or not empty
//  if (event.setID !== null && event.setID !== ''){
 //   setID = event.setID;
 //   console.log(setID);
 // }


  // Step 1: Create DynamoDB Document Client - provided better formatted JSON 
  const documentClient = new AWS.DynamoDB.DocumentClient({region: 'us-east-2'});
  let responseBody = "";
  let statusCode = 0;
 
  // Step 2: Create a variable to hold our parameters:

var params = 
{
    TableName: "Cards",
    IndexName: "status-year-index",
    KeyConditions: {
        status: {
            ComparisonOperator: "EQ", 
            AttributeValueList: [ 
                "OK"
            ]
        }
    },
    // true = ascending  or false = descending.  
    // If the Sort Key of the Index is a number or date you can sort by it!
    ScanIndexForward: true  
}

  // Step 3: Call query() from the DynamoDB API to fetch blogs with a given blogType
  // Send back stringified JSON...
  try {
    const data = await documentClient.query(params).promise();
    responseBody = JSON.stringify(data);
    statusCode = 200;
    }
    catch (err) {
      responseBody = JSON.stringify(err);
      statusCode = 403; 
      console.log(err);
      }

      const response = {
        statusCode: statusCode,
        headers: {
          "Content-Type": "application/json"
        },
        body: responseBody
      };
      
      return response;
  }; // end handler
  
  
