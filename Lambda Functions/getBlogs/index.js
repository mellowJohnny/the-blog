
/*
*  getBlogPosts Lambda Function
*/

// Load the AWS SDK for Node.js
const AWS = require('../createBlogPost/node_modules/aws-sdk');

// Set the region
AWS.config.update({region: 'us-east-2'});

exports.handler = function (event, context, callback) {

  // Step 1: Create DynamoDB service object
  const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

  // Step 2: Create a variable to hold our parameters:
  const params = {
    TableName: 'BlogPost',
  }

  // Step 3: Call scan() from the DynamoDB API to fetch all Blog Posts:
  ddb.scan(params, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    //console.log("Success", data.Items);
    data.Items.forEach(function(element, index, array) {
      console.log(element.ID.S + " (" + element.postBody.S + ")");
    });
  }
});
  
}
