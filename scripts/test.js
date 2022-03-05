/** 
    * TEST AWS call 
    * fetchTest() is called onload from the test.html page
    * Which is responsible for passing in the year we display
  */

 function fetchTest(year) {

    const passedYear = year;

    // Test endpoint
    const urlToFetch = `https://c9kzoz1g13.execute-api.us-east-2.amazonaws.com/dev?year=${passedYear}`;

       
    fetch(urlToFetch)
        .then(function (response) {
            const jsonResponse = response.json();
            return jsonResponse; // Our Promise object
        })
        .then(function (data) {

        // 'data' is an Object at this point...this is basically the record set returned by dynamoDB
        // First let's return an array of the object's properties
        const returnedData = Object.entries(data); 
       
        // Let's print what we have so far...
        // console.log(`We are back from our API call: ${returnedData}`);  
        
        // Next let's just get the 'body' property returned by the Lambda call
           for (const [key, value] of returnedData) {
               if (key === "body"){
                /** 
                 * Now that we have the 'body' key, we need to convert the value 
                 * (currently a JSON String) to a JSON Object 
                 **/ 
                const myYear = JSON.parse(value);
               // console.log(`in the for loop: ${myYear}`);  
                
                 displayBlog(myYear);
                
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
