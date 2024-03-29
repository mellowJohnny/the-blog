// Include the AWS SDK module
const AWS = require('aws-sdk');

// Instantiate a DynamoDB document client with the SDK
let dynamodb = new AWS.DynamoDB.DocumentClient();

// Define handler function, the entry point to our code for the Lambda service
// We receive the object that triggers the function as a parameter from the web page submit
exports.handler = async (event) => {
    
    // Extract values from the Event object and format as strings...
    // The Event object's properties were populated when we made the API call from our html page
    let setName = JSON.stringify(`${event.setName}`);
    let postBody = JSON.stringify(`${event.postBody}`);
    let mfg = JSON.stringify(`${event.mfg}`);
    let size = JSON.stringify(`${event.size}`);
    let subsets = JSON.stringify(`${event.subsets}`);
    
    // Fix the Year - needs to be converted to a Number
    // First strip off the leading and trailing double-quotes, then convert the string we have to an int
    let yr = JSON.stringify(`${event.year}`);
    let cleanYear = yr.slice(1,-1);
    let year = parseInt(cleanYear);
    
    // Generate a random, unique-ish ID
    // We have indexed this field in DynamoDB to be able to potentially query on it later
    let rawID = Math.random().toString(36).slice(2);
    const setId = JSON.stringify(rawID);
    
    // Pre-Fill some fields the CMS does not populate...
    // We only Stringify the image paths because we use them back in the web application
    // Status is only ever used to query
    let imageSlug = "https://s3.us-east-2.amazonaws.com/mellowjohnny.cc.files/img/cards/";
    const headerImg = JSON.stringify(imageSlug);
    const footerImg = JSON.stringify(imageSlug);
    const status = "OK";
    
    // Create JSON object with parameters for DynamoDB and store in a variable
    let params = {
        TableName:'Cards',  
        Item: {                
            'setName': setName,
            'setID': setId,
            'size': size,
            'subsets': subsets,
            'mfg': mfg,
            'year': year,
            'headerImg': headerImg,
            'footerImg': footerImg,
            'status': status,
            'postBody': postBody
            
        }
        
     }; // end event
    
    // Using await, make sure object writes to DynamoDB table before continuing execution
    await dynamodb.put(params).promise();
    
    // Create a JSON object with our response and store it in a constant
    const response = {
        statusCode: 200,
        body: 'Your post was successfully submitted. Have a lovely day!'
    };
    // Return the response constant
    return response;
};

