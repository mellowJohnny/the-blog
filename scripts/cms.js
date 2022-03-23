
// ----------------------------- Create New Blog Post ---------------------------------------

/**
 * This is the main AWS call used to CREATE a NEW BLOG POST
 * Called from the wlcms.html page
 * @param {*} title 
 * @param {*} author 
 * @param {*} postBody 
 */

 function callCreateBlogPostAPI (title,author,postBody,type){
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
  
  
  // -------------------------------- Create New Card Post -------------------------------------------------------
  
  /**
   * This is the main AWS call used to CREATE a NEW CARDS POST
   * Called from the wlcms.html page
   * @param {*} setName 
   * @param {*} size
   * @param {*} subsets
   * @param {*} stars
   * @param {*} formats
   * @param {*} year
   * @param {*} postBody 
   * @param {*} mfg 
   */
  
   function callCreateCardSetAPI(setName,size,subsets,stars,formats,year,postBody,mfg){
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

/**
 * fetchAllCardSets Function
 * Used to fetch all cards sets to be able present a list of all card set reviews 
 * This will then allow CMS users to select a single set to be subsequently updated in the CMS
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
* Function to Fetch All Card Sets 
* Used by CMS to present Card Set names to allow for an individual set to be updated
* Called by fetchAllCardSets()
* @param {*} setID
* @param {*} setName 
*/

function displayCardSets(setID, setName) {

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

/** 
 * This function fetches a single card set, given it's ID
 * 
 * **/

function fetchCardSetsByID(id) {
  // Set up a global variable to hold the API URL
  const urlToFetch = `https://.execute-api.us-east-2.amazonaws.com/dev?setID=${id}`;
        
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
              let blogBody = document.getElementById("editSetDiv");
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
                 editCardSet(
                  cardSetArray.Items[i].setID,
                  cardSetArray.Items[i].setName);
              }
          }
      }

     })
     .catch(function (err) {
         // Error...return a friendly message
         let blogBody = document.getElementById("editSetDiv");
         blogBody.innerHTML = `...Ah, Houston, we've had a problem...`;
         console.log('Something went wrong...: ' + err);
     });
}













      
