/** 
    * This is the main AWS call used to fetch ALL CARDS SET reviews
    * AWS API Gateway API call - getCardSets end-point
    * Called from the index.html page
  */

 function fetchAllCardSets() {
    // Set up a global variable to hold the API URL
    const urlToFetch = `https://tx7romovbd.execute-api.us-east-2.amazonaws.com/dev?setID=75q4e6zqfm8`;
          
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

            // Now that we have the 'body' key, we need to convert the value (currently a JSON String) to a JSON Object 
            // so that we can pull out the properties of each blog post 
            const cardSetArray = JSON.parse(value);
               
            // Now that the data we got back is a JSON object, let's loop over all the Posts...
            // The 'Items' property holds an array of all the set reviews 
            // Let's loop through that array and display the fields we want!
            // We call the displayBlog() function to control the display
            // calling it once for each set review, essentially populating each review one at a time

               for (var i = 0; i < cardSetArray.Items.length; i++) {
                   displayBlog(cardSetArray.Items[i].postBody,
                    cardSetArray.Items[i].year,
                    cardSetArray.Items[i].mfg,
                    cardSetArray.Items[i].size,
                    cardSetArray.Items[i].subsets,
                    cardSetArray.Items[i].headerImg,
                    cardSetArray.Items[i].footerImg,
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
 * @param {*} size
 * @param {*} subsets 
 * @param {*} headerImg
 * @param {*} footerImg
 * @param {*} setName 
 */

   function displayBlog(postBody, year, mfg, size, subsets, headerImg, footerImg, setName) {
       // Populate the blogsDiv...
 
       // Cleanup the JSON we get back so it's back to a String 
       // We parsed the first object we got back, but that didn't parse the contents of the inner properties
       // so we need to explicitly parse title, author, and the blog
       const cleanPostBody = JSON.parse(postBody);
       const cleanYear = JSON.parse(year);
       const cleanMFG = JSON.parse(mfg);
       const cleanSetSize = JSON.parse(size);
       const cleanSubsets = JSON.parse(subsets);
       const cleanHeaderImg = JSON.parse(headerImg);
       const cleanFooterImg = JSON.parse(footerImg);
       const cleanSetName = JSON.parse(setName);
       
       
       
       // Setup a variable to hold the reference to our Div, 'cause we got work to do!
       let blogBody = document.getElementById("cardSetsDiv");
       blogBody.innerHTML += 
                    `<p>
                    <table>
                        <tr>
                            <td><img src="${cleanHeaderImg}"></img></td>
                        </tr>
                        <tr>
                            <td><strong>${cleanSetName}</strong></td>
                        </tr>
                        <tr>
                            <td><strong><i>Set Size:</i></strong> ${cleanSetSize} cards</td>
                        </tr>
                        <td>
                            <td><strong><i>Sub Sets & Inserts:</i></strong> ${cleanSubsets} </td>
                        </tr>
                        <tr>
                            <td><strong><i>Release Year:</i></strong> ${cleanYear} </td>
                        </tr>
                        <tr>
                            <td><strong><i>Manufacturer:</i></strong> ${cleanMFG}</td>
                        </tr>
                    </table>
                    <br><br>
                    ${cleanPostBody} 
                    </p> 
                    <img src="${cleanFooterImg}"></img>
                    
                    <hr/> `;
   }
