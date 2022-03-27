

/** This Script defines all the functions used by the CMS
 * section of the site to both create and update existing 
 * blog posts and card set reviews
 */

// --------------------- Create New Blog Post ----------------------------

/**
 * This is the main AWS call used to CREATE a NEW BLOG POST
 * Called from the wlcms.html page
 * Calls the createBlogPost API exposed by AWS API Gateway
 * 
 * @param {*} title 
 * @param {*} author 
 * @param {*} postBody 
 * @param {*} type
 * 
 */

 function createBlogPost (title,author,postBody,type){
    // Let's change the state of the button, now that we've clicked it...
    document.getElementById('cmsSubmitButton').style.backgroundColor = "#36a5e6";
    document.getElementById('cmsSubmitButton').innerHTML = "Crossing Fingers...";

    // instantiate a headers object
    let myHeaders = new Headers();
  
    // add content type header to object
    myHeaders.append("Content-Type", "application/json");
  
    // using built in JSON utility package turn object to string and store in a variable
    let raw = JSON.stringify({"title":title,"author":author,"postBody":postBody,"type":type});
  
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
  
  
  // -------------------- Create New Card Set --------------------------------------
  
  /**
   * This is the main AWS call used to CREATE a NEW CARDS POST
   * The createCardSet() function is called from the wlcms.html page
   * Calls the createCardSet API exposed by AWS API Gateway 
   * 
   * @param {*} setName 
   * @param {*} size
   * @param {*} subsets
   * @param {*} stars
   * @param {*} formats
   * @param {*} year
   * @param {*} postBody 
   * @param {*} mfg 
   * 
   */
  
   function createCardSet(setName,size,subsets,stars,formats,year,postBody,mfg){
      // Let's change the state of the button, now that we've clicked it...
      document.getElementById('cmsSubmitButton').style.backgroundColor = "#36a5e6";
      document.getElementById('cmsSubmitButton').innerHTML = "Crossing Fingers...";

      // instantiate a headers object
      let myHeaders = new Headers();
    
      // add content type header to object
      myHeaders.append("Content-Type", "application/json");
    
      // using built in JSON utility package turn object to string and store in a variable
      let raw = JSON.stringify({"setName":setName,"size":size,"subsets":subsets,"stars":stars,"formats":formats,"year":year,"postBody":postBody,"mfg":mfg});
    
      // create a JSON object with parameters for API call and store in a variable
      let requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
        };
      
      // make API call to cardPost endpoint with parameters and use promises to get response
      fetch("https://05uss9ffij.execute-api.us-east-2.amazonaws.com/dev", requestOptions)
      .then(response => response.text())
      .then(result => alert(JSON.parse(result).body))
      .catch(error => console.log('error', error));
      }

// ----------------- Fetch All Card Sets For Update ---------------------------------------

/**
 * This Function is used to fetch all records from the Card table in DynamoDB
 * The API limits the data returned to only the name of the card set and it's ID  
 * It is used by the CMS users to allow Users to select a single set to be updated
 * Calls the getCardSets API exposed by AWS API Gateway
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

// ----------------- displayCardSets Helper Function -------------------------

/**
* Helper function Called by fetchAllCardSets() to apply HTML formatting a Card Set record 
* Used by CMS to present Card Set names to allow for an individual set to be updated, passing the ID to setEdit.html
* 
* @param {*} setID
* @param {*} setName 
*
*/

function displayCardSets(setID, setName) {

  // Cleanup the JSON we get back so it's back to a String 
  // We parsed the first object we got back, but that didn't parse the contents of the inner properties
  // so we need to explicitly parse setName as it will come back with double-quotes around it.
  // setID comes back as a string with no extra quotes so no need to JSON.parse() it
  const cleanSetID = setID;
  const cleanSetName = JSON.parse(setName);
  
  // Setup a variable to hold the reference to our Div, 'cause we got work to do!
  let blogBody = document.getElementById("editBlogsDiv");
  blogBody.innerHTML += 
               `
               <table class="set-details-table-style">
                   <tr>
                       <td style="width:400px;font-size:20px">
                          <a href="setEdit.html?setID=${cleanSetID}">
                          <strong>${cleanSetName}</strong>
                          </a>
                       </td>
                   </tr>
               </table>
               `;
}

// ---------------- Fetch Card Set by ID - Populates the CMS Form For Update --------------------------

/** 
 * This function fetches a single card set, given it's ID
 * and parses out the individual fields
 * It the calls populateCardSet() which in turn populates the HTML form on setEdit.html
 * Calls the getCardSetByID API exposed by AWS API Gateway
 * 
 * @param {*} id
 * 
 **/

function fetchCardSetByID(id) {
  // Set up a global variable to hold the API URL
  const urlToFetch = ` https://733bwunxq6.execute-api.us-east-2.amazonaws.com/dev?setID=${id}`;
        
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
              let blogBody = document.getElementById("errorDiv");
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
                 populateCardSet(cardSetArray.Items[i].postBody,
                    cardSetArray.Items[i].year,
                    cardSetArray.Items[i].mfg,
                    cardSetArray.Items[i].size,
                    cardSetArray.Items[i].subsets,
                    cardSetArray.Items[i].stars,
                    cardSetArray.Items[i].formats,
                    cardSetArray.Items[i].setName);
              }
          }
      }

     })
     .catch(function (err) {
         // Error...return a friendly message
         let blogBody = document.getElementById("errorDiv");
         blogBody.innerHTML = `...Ah, Houston, we've had a problem...`;
         console.log('Something went wrong...: ' + err);
     });
}

// ----------------- populateCardSet Helper Function -------------------------

/**
* Helper function Called by fetchCardSetByID() 
* Used by CMS to pre-populate each form field for a given Card Set 
* 
* @param {*} postBody
* @param {*} year 
* @param {*} mfg
* @param {*} size
* @param {*} subsets
* @param {*} stars
* @param {*} formats
* @param {*} setName
*/

/** This function calls the associated DIV on the Set Update form and populates it with the current value */
function populateCardSet(postBody,year,mfg,size,subsets,stars,formats,setName) {

    // Cleanup the JSON we get back so it's back to a String 
    // We parsed the first object we got back, but that didn't parse the contents of the inner properties
    // so we need to explicitly parse all the properties we need to send back
    const cleanPostBody = JSON.parse(postBody);
    const cleanYear = JSON.parse(year);
    const cleanMFG = JSON.parse(mfg);
    const cleanSetSize = JSON.parse(size);
    const cleanSubsets = JSON.parse(subsets);
    const starsString = JSON.parse(stars);
    const cleanFormats = JSON.parse(formats);
    const numStars = parseInt(starsString);
    const cleanSetName = JSON.parse(setName);

    // Now that we have cleaned up the data we got back from DynamoDB, let's
    // populate the form on setEdit.html with the values as defaults
    document.getElementById("postBody").defaultValue = cleanPostBody;
    document.getElementById("year").defaultValue = cleanYear;
    document.getElementById("mfg").defaultValue = cleanMFG;
    document.getElementById("size").defaultValue = cleanSetSize;
    document.getElementById("subsets").defaultValue = cleanSubsets;
    document.getElementById("stars").defaultValue = numStars;
    document.getElementById("formats").defaultValue = cleanFormats;
    document.getElementById("setName").defaultValue = cleanSetName;
}

// ----------------------------- Update Card Set ---------------------------------------

/** 
 * This function is used to UPDATE an existing Card Set review
 * Calls the updateCardSet API which updates the matching record in DynamoDB
 * 
 * @param {*} setName
 * @param {*} size 
 * @param {*} subsets
 * @param {*} stars
 * @param {*} formats
 * @param {*} year
 * @param {*} postBody
 * @param {*} mfg
 * 
 **/

function updateCardSet(setName,size,subsets,stars,formats,year,postBody,mfg) {
    // Let's change the state of the button, now that we've clicked it...
    document.getElementById('cmsSubmitButton').style.backgroundColor = "#36a5e6";
    document.getElementById('cmsSubmitButton').innerHTML = "Crossing Fingers...";

    // instantiate a headers object
    let myHeaders = new Headers();
    
    // add content type header to object
    myHeaders.append("Content-Type", "application/json");
  
    // using built in JSON utility package turn object to string and store in a variable
    let raw = JSON.stringify({"setName":setName,"size":size,"subsets":subsets,"stars":stars,"formats":formats,"year":year,"postBody":postBody,"mfg":mfg});

    // create a JSON object with parameters for API call and store in a variable
    let requestOptions = {
      method: 'PUT',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
      };

    // Make call to updateCardSet API endpoint in API Gateway with parameters and use promises to get response
    fetch("https://bb8yehibjb.execute-api.us-east-2.amazonaws.com/dev", requestOptions)
    .then(response => response.text())
    .then(result => alert(JSON.parse(result).body))
    .catch(error => console.log('error', error));
    
}

// ----------------------------- Update Blog Post ---------------------------------------

/** 
 * This function is used to UPDATE an existing Blog Post
 * Calls the updateBlogPost API which updates the matching record in DynamoDB
 * 
 * @param {*} title
 * @param {*} postBody 
 * 
 **/

 function updateBlogPost(title,postBody) {
    // Let's change the state of the button, now that we've clicked it...
    document.getElementById('cmsSubmitButton').style.backgroundColor = "#36a5e6";
    document.getElementById('cmsSubmitButton').innerHTML = "Crossing Fingers...";

    // instantiate a headers object
    let myHeaders = new Headers();
    
    // add content type header to object
    myHeaders.append("Content-Type", "application/json");
  
    // using built in JSON utility package turn object to string and store in a variable
    let raw = JSON.stringify({"title":title,"postBody":postBody});

    // create a JSON object with parameters for API call and store in a variable
    let requestOptions = {
      method: 'PUT',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
      };

    // Make call to updateCardSet API endpoint in API Gateway with parameters and use promises to get response
    fetch("https://.execute-api.us-east-2.amazonaws.com/dev", requestOptions)
    .then(response => response.text())
    .then(result => alert(JSON.parse(result).body))
    .catch(error => console.log('error', error));
    
}


/**
 * This Function is used to fetch all records from the Blog table in DynamoDB
 * The API limits the data returned to only the name of the blog and its blogID  
 * It is used by the CMS users to allow Users to select a single blog to be updated
 * Calls the getBlogsForUpdate API exposed by AWS API Gateway
 */

 function getBlogsForUpdate() {

    // Set up a global variable to hold the API URL
    const urlToFetch = `https://pqf303gfq6.execute-api.us-east-2.amazonaws.com/dev/`;
          
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
            const blogArray = JSON.parse(value);
  
            // Check to see if we have any results...    
            if (blogArray.Items.length === 0) {
  
                // No results...return a friendly message
                let blogBody = document.getElementById("listBlogsDiv");
                blogBody.innerHTML = `...these aren't the Droids you're looking for...`;
  
                // If we have no results, stop processing
                return;
            }
  
            // Now that the data we got back is a JSON object, let's loop over all the Posts...
            // The 'Items' property holds an array of all the set reviews 
            // Let's loop through that array and display the fields we want!
            // We call the displayBlog() function to control the display, calling it once
            // for each set review, essentially populating each review one at a time
  
               for (var i = 0; i < blogArray.Items.length; i++) {
                   displayBlogs(
                    blogArray.Items[i].title,
                    blogArray.Items[i].blogID);
                }
            }
        }
  
       })
       .catch(function (err) {
           // Error...return a friendly message
           let blogBody = document.getElementById("listBlogsDiv");
           blogBody.innerHTML = `...Ah, Houston, we've had a problem...`;
           console.log('Something went wrong...: ' + err);
       });
  }

  // ----------------- displayBlogs Helper Function -------------------------

/**
* Helper function Called by fetchAllCardSets() to apply HTML formatting a Blog record 
* Used by CMS to present Blog titles to allow for an individual blog to be updated, passing the blogID to blogEdit.html
* 
* @param {*} title 
* @param {*} blogID 
*
*/

function displayBlogs(title, blogID) {

    // Cleanup the JSON we get back so it's back to a String 
    // We parsed the first object we got back, but that didn't parse the contents of the inner properties
    // so we need to explicitly parse setName as it will come back with double-quotes around it.

    // setID comes back as a string with no extra quotes so no need to JSON.parse() it (blogID does not!)
    const cleanTitle = JSON.parse(title);
    //const cleanBlogID = JSON.parse(blogID);
    
    // Setup a variable to hold the reference to our Div - this is how we connect to the HTML page from the JS function
    let blogBody = document.getElementById("listBlogsDiv");
    blogBody.innerHTML += 
                 `<table class="set-details-table-style">
                     <tr>
                         <td style="width:400px;font-size:20px">
                            <a href="blogEdit.html?blogID=${blogID}">
                            <strong>${cleanTitle}</strong>
                            </a>
                         </td>
                     </tr>
                 </table>`;
  }














      
