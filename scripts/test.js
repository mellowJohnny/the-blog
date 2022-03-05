/** 
    * TEST AWS call 
    * AWS Lambda call 
    * Called from the test.html page
  */

 function fetchTest() {

    // Test endpoint
    const urlToFetch = `https://c9kzoz1g13.execute-api.us-east-2.amazonaws.com/dev?year=2022`;

       
    fetch(urlToFetch)
        .then(function (response) {
            const jsonResponse = response.json();
            return jsonResponse; // Our Promise object
        })
        .then(function (data) {

        // 'data' is an Object at this point...this is basically the record set returned by dynamoDB
        // First let's return an array of the object's properties
        const returnedData = Object.entries(data); 
        const cleanData = JSON.parse(returnedData);

        // Let's print what we have so far...
        console.log(`We are back from DynamoDB: ${cleanData}`);  
        
        // Next let's just get the 'body' property returned by the Lambda call
           for (const [key, value] of returnedData) {
               if (key === "body"){
                /** 
                 * Now that we have the 'body' key, we need to convert the value 
                 * (currently a JSON String) to a JSON Object 
                 * so that we can pull out the properties of each blog post 
                 **/ 
                const blogPostArray = JSON.parse(value);
              
                /** Now that the data we got back is a JSON object, let's loop over all the Posts...
                 * The 'Items' property holds an array of all the blog posts 
                 * Let's loop through that array and display the fields we want!
                 * We call the displayBlog() function to control the display of the blog post
                 * It gets called it once for each blog post, essentially populating each blog post one at a time
                 **/
                for (var i = 0; i < blogPostArray.Items.length; i++) {
                    displayBlog(blogPostArray.Items[i].year);
                 }
            }
        } 
            
        })
        .catch(function (err) {
            console.log('Something went wrong...: ' + err);
        });
       }
 
 /**
  * Function to DISPLAY Blogs dynamically
  * @param {*} year 
  */
 
    function displayBlog(year) {
        // Populate the blogsDiv...
  
        // Cleanup the JSON we get back so it's back to a String 
        // We parsed the first object we got back, but that didn't parse the contents of the inner properties
        // so we need to explicitly parse title, author, and the blog
        const cleanYear = JSON.parse(year);
         
        // Setup a variable to hold the reference to our Div, 'cause we got work to do!
        let blogBody = document.getElementById("testDiv");
        blogBody.innerHTML += 
                     `<p>
                     <strong>The Year is: ${cleanYear}</strong> <br>
                     </p> <hr/> `;
    }
