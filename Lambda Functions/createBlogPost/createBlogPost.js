// Include the AWS SDK module
const AWS = require('aws-sdk');

// Instantiate a DynamoDB document client with the SDK
let dynamodb = new AWS.DynamoDB.DocumentClient();

// Use built-in module to get current date & time
let date = new Date();

// Store date and time in human-readable format in a variable, w/o time
let now = date.toISOString();

// Define handler function, the entry point to our code for the Lambda service
// We receive the object that triggers the function as a parameter from the web page submit
exports.handler = async (event) => {
    
    // Extract values from the Event object and format as strings...
    // The Event object's properties were populated when we made the call from our html page
    let title = JSON.stringify(`${event.title}`);
    let author = JSON.stringify(`${event.author}`);
    let postBody = JSON.stringify(`${event.postBody}`);
    
    // Fix the blogType - needs to be converted to a Number
    // First strip off the leading and trailing double-quotes
    // Then convert the string we have into an int
    let bType = JSON.stringify(`${event.type}`);
    let cleanBlogType = bType.slice(1,-1);
    let blogType = parseInt(cleanBlogType);
    
    // Create JSON object with parameters for DynamoDB and store in a variable
    let params = {
        TableName:'Blogs',  
        Item: {                
            'blogType': blogType,
            'time': now,
            'title': title,
            'author': author,
            'postBody': postBody
        }
        
        }; // end event
    
    // Using await, make sure object writes to DynamoDB table before continuing execution
    await dynamodb.put(params).promise();
    
    // Create a JSON object with our response and store it in a constant
    const response = {
        statusCode: 200,
        body: 'Your post was successfully submitted. Have a lovely day'
    };
    // Return the response constant
    return response;
};

