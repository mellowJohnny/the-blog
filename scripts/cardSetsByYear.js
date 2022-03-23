/** 
    * This AWS API call used to fetch card sets given a specific year
    * AWS API Gateway API call - getCardSets end-point
    * Called from the index.html page
  */

 function fetchCardSetsByYear(year) {

    const currentYear = year;

    // Call the Page Header function to dynamically create & populate the page header
    renderYearHeader(currentYear);

    // Set up a global variable to hold the API URL
    const urlToFetch = `https://a92dwyl3ic.execute-api.us-east-2.amazonaws.com/dev?year=${year}`;
          
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

            // Check to see if we have any results...    
            if (cardSetArray.Items.length === 0) {

                // No results...return a friendly message
                let blogBody = document.getElementById("blogsDiv");
                blogBody.innerHTML = `...these aren't the Droids you're looking for...`;

                // If we have no results, stop processing
                return;
            }

            // Now that the data we got back is a JSON object, let's loop over all the Posts...
            // The 'Items' property holds an array of all the set reviews 
            // Let's loop through that array and display the fields we want!
            // We call the displayBlog() function to control the display, calling it once
            // for each set review, essentially populating each review one at a time

               for (var i = 0; i < cardSetArray.Items.length; i++) {
                   displayBlog(cardSetArray.Items[i].postBody,
                    cardSetArray.Items[i].year,
                    cardSetArray.Items[i].mfg,
                    cardSetArray.Items[i].size,
                    cardSetArray.Items[i].subsets,
                    cardSetArray.Items[i].stars,
                    cardSetArray.Items[i].formats,
                    cardSetArray.Items[i].headerImg,
                    cardSetArray.Items[i].footerImg,
                    cardSetArray.Items[i].setName);
                }
            }
        }

       })
       .catch(function (err) {
           // Error...return a friendly message
           let blogBody = document.getElementById("blogsDiv");
           blogBody.innerHTML = `...Ah, Houston, we've had a problem...`;
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
 * @param {*} stars
 * @param {*} formats
 * @param {*} headerImg
 * @param {*} footerImg
 * @param {*} setName 
 */

   function displayBlog(postBody, year, mfg, size, subsets, stars, formats, headerImg, footerImg, setName) {
       // Populate the blogsDiv...
 
       // Cleanup the JSON we get back so it's back to a String 
       // We parsed the first object we got back, but that didn't parse the contents of the inner properties
       // so we need to explicitly parse title, author, and the blog
       const cleanPostBody = JSON.parse(postBody);
       const cleanYear = JSON.parse(year);
       const cleanMFG = JSON.parse(mfg);
       const cleanSetSize = JSON.parse(size);
       const cleanSubsets = JSON.parse(subsets);
       const starsString = JSON.parse(stars);
       const cleanFormats = JSON.parse(formats);
       const numStars = parseInt(starsString);
       const cleanHeaderImg = JSON.parse(headerImg);
       const cleanFooterImg = JSON.parse(footerImg);
       const cleanSetName = JSON.parse(setName);

       // Generate n number of "Star" emojis, one per rating number
       let cleanStars = "";
       for (let i=0; i < numStars; i++){
        cleanStars += "&#127775 "; 
       }
       
       // Setup a variable to hold the reference to our Div, 'cause we got work to do!
       let blogBody = document.getElementById("blogsDiv");
       blogBody.innerHTML += 
                    `
                    <table class="set-details-table-style">
                        <tr>
                            <td style="width:400px;font-size:20px"><strong>${cleanSetName}</strong></td>
                            <td rowspan="7" style="text-align:center"><img src="${cleanHeaderImg}" class="table-header-img"></img></td>
                        </tr>
                        
                        <tr>
                            <td><strong><i>Set Size:</i></strong> ${cleanSetSize} cards</td>
                            
                        </tr>
                        <tr>
                            <td><strong><i>Inserts:</i></strong> ${cleanSubsets} </td>
                        </tr>
                        <tr>
                            <td><strong><i>Release Year:</i></strong> ${cleanYear} </td>
                        </tr>
                        <tr>
                            <td><strong><i>Available Formats:</i></strong> ${cleanFormats} </td>
                        </tr>
                        <tr>
                            <td><strong><i>Manufacturer:</i></strong> ${cleanMFG}</td>
                        </tr>
                        <tr>
                            <td><strong><i>Hella Rating:</i></strong> ${cleanStars}</td>
                        </tr>
                        
                    </table>
                    
                    ${cleanPostBody} 
                    </p> 
                    <table class="set-footer-table-style">
                        <tr>
                            <td style="text-align:left" class="caption"><strong>...and the winners are...</strong></td>
                        </tr>
                        <tr>
                            <td style="text-align:center">
                            <img src="${cleanFooterImg}" class="table-footer-img"></img>
                            </td>
                        </tr>
                    </table>
                   <br> 
                   <hr/> 
                   <br>
                   <br>`;
   }


/* 
    Function called on page load to dynamically pass in the year pulled from the request 
    and render the pager header.
*/
function renderYearHeader(year) {
    let pageHeader = document.getElementById("pageHeader");
    pageHeader.innerHTML = `...card sets from ${year}`;
}

/**
 * fetchAllCardSets Function
 * Used to fetch all cards sets so as to be able to select a single set
 * to be subsequently updated in the CMS
 */

 function fetchAllCardSets() {

    // Set up a global variable to hold the API URL
    const urlToFetch = `https://tx7romovbd.execute-api.us-east-2.amazonaws.com/dev`;
          
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

            // Check to see if we have any results...    
            if (cardSetArray.Items.length === 0) {

                // No results...return a friendly message
                let blogBody = document.getElementById("editBlogsDiv");
                blogBody.innerHTML = `...these aren't the Droids you're looking for...`;

                // If we have no results, stop processing
                return;
            }

            // Now that the data we got back is a JSON object, let's loop over all the Posts...
            // The 'Items' property holds an array of all the set reviews 
            // Let's loop through that array and display the fields we want!
            // We call the displayBlog() function to control the display, calling it once
            // for each set review, essentially populating each review one at a time

               for (var i = 0; i < cardSetArray.Items.length; i++) {
                   displayCardSets(
                    cardSetArray.Items[i].setID,
                    cardSetArray.Items[i].setName);
                }
            }
        }

       })
       .catch(function (err) {
           // Error...return a friendly message
           let blogBody = document.getElementById("editBlogsDiv");
           blogBody.innerHTML = `...Ah, Houston, we've had a problem...`;
           console.log('Something went wrong...: ' + err);
       });
}

/**
 * Function to DISPLAY Blogs dynamically
 * @param {*} setID
 * @param {*} setName 
 */

 function displayCardSets(setID, setName) {
    // Populate the blogsDiv...

    // Cleanup the JSON we get back so it's back to a String 
    // We parsed the first object we got back, but that didn't parse the contents of the inner properties
    // so we need to explicitly parse title, author, and the blog
    const cleanSetID = JSON.parse(setID);
    const cleanSetName = JSON.parse(setName);
    
    // Setup a variable to hold the reference to our Div, 'cause we got work to do!
    let blogBody = document.getElementById("editBlogsDiv");
    blogBody.innerHTML += 
                 `
                 <table class="set-details-table-style">
                     <tr>
                         <td style="width:400px;font-size:20px">
                            <a href="editSet.html?setID=${cleanSetID}">
                            <strong>${cleanSetName}</strong>
                            </a>
                         </td>
                     </tr>
                 </table>
                 `;
}
