
/*
*  getBlogPosts Lambda Function
*/

// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');

// Set the region
AWS.config.update({region: 'us-east-2'});

exports.handler = async (event, context) => {

  // Step 1: Create DynamoDB Document Client - provided better formatted JSON 
  const documentClient = new AWS.DynamoDB.DocumentClient({region: 'us-east-2'});
  
  // Step 2: Create a variable to hold our parameters:
  const params = {
    TableName: 'BlogPost',
  }

  // Step 3: Call scan() from the DynamoDB API to fetch all Blog Posts:
  try {
    const data = await documentClient.scan(params).promise();
    data.Items.forEach(function(element, index, array) {
      console.log(element.ID + " (" + element.postBody + ")")
      });
      return data;
    }
    catch (err) {
      console.log(err);
      }
  } // end handler