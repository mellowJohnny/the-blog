/** 
    * This is the main AWS call used to fetch ALL CARDS SET reviews
    * AWS API Gateway API call - getCardSets end-point
    * Called from the index.html page
  */

 function fetchAllCardSets() {
    // Set up a global variable to hold the API URL
    const urlToFetch = `https://tx7romovbd.execute-api.us-east-2.amazonaws.com/dev/`;
          
    fetch(urlToFetch)
       .then(function (response) {
           const jsonResponse = response.json();
           return jsonResponse; // Our Promise object
       })
       .then(function (data) {
       // 'data' is an Object at this point...this is basically the record set returned bt dynamoDB
       // First let's return an array of the object's properties
           const returnedData = Object.entries(data); 
         
       // Next let's just get the 'body' property returned by the Lambda call
          for (const [key, value] of returnedData) {
              if (key === "body"){
               /** 
                * Now that we have the 'body' key, we need to convert the value 
                * (currently a JSON String) to a JSON Object 
                * so that we can pull out the properties of each blog post 
                **/ 
               const cardSetArray = JSON.parse(value);
             
               /** Now that the data we got back is a JSON object, let's loop over all the Posts...
                * The 'Items' property holds an array of all the blog posts 
                * Let's loop through that array and display the fields we want!
                * We call the displayBlog() function to control the display of the blog post
                * It gets called it once for each blog post, essentially populating each blog post one at a time
                **/
         
// Should be put an if in here to check which type of blogs we have to format?

               for (var i = 0; i < cardSetArray.Items.length; i++) {
                   displayBlog(cardSetArray.Items[i].postBody,
                    cardSetArray.Items[i].year,
                    cardSetArray.Items[i].mfg,
                    cardSetArray.Items[i].setName);
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
 * @param {*} postBody 
 * @param {*} year 
 * @param {*} mfg 
 * @param {*} setName 
 * @param {*} img
 */

   function displayBlog(postBody, year, mfg, setName) {
       // Populate the blogsDiv...
 
       // Cleanup the JSON we get back so it's back to a String 
       // We parsed the first object we got back, but that didn't parse the contents of the inner properties
       // so we need to explicitly parse title, author, and the blog
       const cleanYear = JSON.parse(year);
       const cleanMFG = JSON.parse(mfg);
       const cleanSetName = JSON.parse(setName);
       const cleanPostBody = JSON.parse(postBody);
     //  const cleanImg = JSON.parse(img);

       // Format the Date by passing it to our Magic Date fixer...
       fixDate(date);
        
       // Setup a variable to hold the reference to our Div, 'cause we got work to do!
       let blogBody = document.getElementById("cardSetsDiv");
       blogBody.innerHTML += 
                    `<p>
                    <strong>${cleanSetName}</strong> <br>
                    <i>${cleanYear} </i><br>
                    <i>${cleanMFG}</i> <br><br>
                    ${cleanPostBody} 
                    </p> <hr/> `;
   }
