// Include the AWS SDK module
const AWS = require('aws-sdk');

// Instantiate a DynamoDB document client with the SDK
let dynamodb = new AWS.DynamoDB.DocumentClient();

// Use built-in module to get current date & time
let date = new Date();

// Store date and time in human-readable format in a variable
let now = date.toISOString();

// Define handler function, the entry point to our code for the Lambda service
// We receive the object that triggers the function as a parameter from the web page submit
exports.handler = async (event) => {
    // Extract values from event and format as strings...
    let title = JSON.stringify(`${event.title}`);
    let author = JSON.stringify(`${event.author}`);
    let postBody = JSON.stringify(`${event.postBody}`);
    
    // Create JSON object with parameters for DynamoDB and store in a variable
    let params = {
        TableName:'BlogPost',
        Item: {
            'ID': title,
            'time': now,
            'author': author,
            'postBody': postBody
        }
    };
    
    // Using await, make sure object writes to DynamoDB table before continuing execution
    await dynamodb.put(params).promise();
    
    // Create a JSON object with our response and store it in a constant
    const response = {
        statusCode: 200,
        body: 'Post Successfully Submitted...'
    };
    // Return the response constant
    return response;
};

// Original <script> to call createBlogPost Lambda:

<script>
        // define the callAPI function that takes the blog title, author and post body as parameters:
        let callAPI = (title,author,postBody)=>{
            // instantiate a headers object
            let myHeaders = new Headers();
            // add content type header to object
            myHeaders.append("Content-Type", "application/json");
            // using built in JSON utility package turn object to string and store in a variable
            let raw = JSON.stringify({"title":title,"author":author,"postBody":postBody});
            // create a JSON object with parameters for API call and store in a variable
            let requestOptions = {
                method: 'POST',
                headers: myHeaders,
                body: raw,
                redirect: 'follow'
            };
            // make API call to BlogPost endpoint with parameters and use promises to get response
            fetch("https://s4ge5t9w06.execute-api.us-east-2.amazonaws.com/dev ", requestOptions)
            .then(response => response.text())
            .then(result => alert(JSON.parse(result).body))
            .catch(error => console.log('error', error));
        }
    </script>
