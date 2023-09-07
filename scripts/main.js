/**
 * There are two main functions here used to either fetch Blogs or Card Sets
 * 1. fetchBlogs() is responsible for fetching all blogs given a blogType parameter, then sorts the results
 * 2. fetchCardSetsByYear() is responsible for fetching all Card Sets given a year parameter
 */

// Global Variables
var globalPageName = "";

/************************** fetchBlogs() Function, also orders the results via getSortOrder ****************/

 /** 
    * This function calls an underlying AWS call used to FETCH ALL BLOG POSTS
    * AWS Lambda call - getBlogs end-point
    * Called from the index.html page
  */

  function fetchBlogs(blogType) {
    // Set up a global variable to hold the API URL
    const urlToFetch = `https://qeb63ean2e.execute-api.us-east-2.amazonaws.com/dev?blogType=${blogType}`;
          
    fetch(urlToFetch)
       .then(function (response) {
           const jsonResponse = response.json();
           return jsonResponse; // Our Promise object
       })
       .then(function (data) {
       // 'data' is an Object at this point...this is basically the record set returned by dynamoDB
       // First let's return an array of the object's properties
           const returnedData = Object.entries(data); 

       // Next let's just get the 'body' property returned by the Lambda call
          for (const [key, value] of returnedData) {
              if (key === "body"){
                // Now that we have the 'body' key, we need to convert the value 
                // (currently a JSON String) to a JSON Object 
                // so that we can pull out the properties of each blog post 
               const blogPostObject = JSON.parse(value);

               // DEBUG
               console.log(`There are ${blogPostObject.Count} blogs returned...`);
               console.log(`The 2nd post is ${blogPostObject.Items[1]}`);
             
            // Next all getSortOrder, passing the attribute we want to sort on. Remember, "Items" is the array of JSON-formatted blogPosts
            // If the blogType passed in from the page is 3 (mach-e blogs) lets display oldest blogs first, for everything else, order newest first 
            if (blogType === "3" || blogType === "5") {
               // We want to sort Mach-E and Raspberry Pi Blogs oldest to newest
                blogPostObject.Items.sort(getSortOrder("time","last"));
            }
            else {
                // We want to sort all other blogs newest to oldest
                blogPostObject.Items.sort(getSortOrder("time","first"));
            }

            // Now that the data we got back is a JSON object, let's loop over all the Posts...
            // The 'Items' property holds an array of all the blog posts. Let's loop through that array and display the fields we want!
            // We call the displayBlog() function to control the display of the blog post
            // It gets called it once for each blog post, formatting each blog post one at a time
         
            for (var i = 0; i < blogPostObject.Items.length; i++) {
                displayBlog(blogPostObject.Items[i].postBody,
                    blogPostObject.Items[i].author,
                    blogPostObject.Items[i].time,
                    blogPostObject.Items[i].title,
                    blogPostObject.Items[i].img,
                    blogPostObject.Items[i].imgCap); // NEW! Aug. 31, 2023
                }
           }
       } 
           
       })
       .catch(function (err) {
           console.log('Something went wrong...: ' + err);
       });
      }

// ****************************************** displayBlog Helper Function *****************************

/**
 * Function to FORMAT & DISPLAY Blogs posts
 * @param {*} postBody 
 * @param {*} author 
 * @param {*} date 
 * @param {*} title 
 * @param {*} img
 * @param {*} imgCap
 */

   function displayBlog(postBody, author, date, title, img, imgCap) {
       // Populate the blogsDiv...
 
       // Cleanup the JSON we get back so it's back to a String 
       // We parsed the first object we got back (the outer DynamoDB record), but that didn't parse the contents 
       // of the inner properties. 
       // We need to explicitly parse title, author, and the blog
       const cleanTitle = JSON.parse(title);
       const cleanAuthor = JSON.parse(author);
       const cleanPostBody = JSON.parse(postBody);
       const cleanImg = JSON.parse(img);
       const cleanImgCap = JSON.parse(imgCap);

       // Format the Date by passing it to our Magic Date fixer...
       fixDate(date);
       
       // Setup a variable to hold the reference to our Div, 'cause we got work to do!
       // First check to see if we have an image - if we don't, exclude the <img> tag...simple, right?
       if (cleanImg === "none") {
       let blogBody = document.getElementById("blogsDiv");
       blogBody.innerHTML += 
                    `<h1 class="blog-title">${cleanTitle}</h1> 
                        <strong><i>${cleanAuthor} </i></strong>
                        <br>
                        <strong><i>${fixDate(date)}</i></strong> 
                        ${cleanPostBody} 
                    <hr/><br>`;
       }
       else{
        let blogBody = document.getElementById("blogsDiv");
        blogBody.innerHTML += 
                    `<h1 class="blog-title">${cleanTitle}</h1> 
                        <strong><i>${cleanAuthor} </i></strong>
                        <br>
                        <strong><i>${fixDate(date)}</i></strong> 
                        <br>
                        ${cleanPostBody} 
                        <img src="${cleanImg}" class="blog-img"></img>
                        <br>
                        <i>${cleanImgCap}</i> 
                        <hr/>
                        <br>`;
       }

       
   }

/*********************************************** fetchCardSetsByYear *************************************/

 /** 
    * This function calls an underlying AWS call used to FETCH ALL card sets given a specific year
    * AWS API Gateway API call - getCardSets end-point
    * Called on page load from various pages
  */

  function fetchCardSetsByYear(year,sortOrder) {
    
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

            // Sort the returned cars set review by number of stars
            // sortOrder is passed in from the html page
            if (sortOrder === ""){
                cardSetArray.Items.sort(cardSetSorter("stars","first"));
            }
            else if (sortOrder === "first") {
                cardSetArray.Items.sort(cardSetSorter("stars","first"));
            }
            else if (sortOrder === "last") {
                cardSetArray.Items.sort(cardSetSorter("stars","last"));
            }
            else {
                cardSetArray.Items.sort(cardSetSorter("stars","first"));
            }
            

            // Check to see if we have any results...    
            if (cardSetArray.Items.length === 0) {

                // No results...return a friendly message
                let blogBody = document.getElementById("cardSetDiv");
                blogBody.innerHTML = `...this set has yet to be reviewed`;

                // If we have no results, stop processing
                return;
            }

            // Now that the data we got back is a JSON object, let's loop over all the Posts...
            // The 'Items' property holds an array of all the set reviews 
            // Let's loop through that array and display the fields we want!
            // We call the displayBlog() function to control the display, calling it once
            // for each set review, essentially populating each review one at a time

               for (var i = 0; i < cardSetArray.Items.length; i++) {
                   displayCardSet(cardSetArray.Items[i].postBody,
                    cardSetArray.Items[i].year,
                    cardSetArray.Items[i].mfg,
                    cardSetArray.Items[i].size,
                    cardSetArray.Items[i].subsets,
                    cardSetArray.Items[i].stars,
                    cardSetArray.Items[i].formats,
                    cardSetArray.Items[i].headerImg,
                    cardSetArray.Items[i].headerImgName,
                    cardSetArray.Items[i].footerImg,
                    cardSetArray.Items[i].footerImgName,
                    cardSetArray.Items[i].setName);
                }
            }
        }

       })
       .catch(function (err) {
           // Error...return a friendly message
           let blogBody = document.getElementById("cardSetDiv");
           blogBody.innerHTML = `...Ah, Houston, we've had a problem...`;
           console.log('Something went wrong...: ' + err);
       });
}

/**
 * Function to FORMAT & DISPLAY card sets 
 * @param {*} postBody 
 * @param {*} year 
 * @param {*} mfg
 * @param {*} size
 * @param {*} subsets 
 * @param {*} stars
 * @param {*} formats
 * @param {*} headerImg
 * @param {*} headerImgName
 * @param {*} footerImg
 * @param {*} footerImgName
 * @param {*} setName 
 */

   function displayCardSet(postBody, year, mfg, size, subsets, stars, formats, headerImg, headerImgName, footerImg, footerImgName, setName) {
       // Populate the cardSetDiv...
 
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
       const cleanHeaderImgName = JSON.parse(headerImgName);
       const cleanFooterImg = JSON.parse(footerImg);
       const cleanFooterImgName = JSON.parse(footerImgName);
       const cleanSetName = JSON.parse(setName);

       // Now that we have the name of the set, render one of two versions of the Header in the HTML page...
        if (pageName === "junkWax") {
            let pageHeader = document.getElementById("pageHeader");
            pageHeader.innerHTML = `...Junk Wax Sets: ${cleanYear}`;
        }
        else {
           let pageHeader = document.getElementById("pageHeader");
            pageHeader.innerHTML = `...classic set review: ${cleanSetName}`;
        }
       

       // Generate n number of "Star" emojis, one per rating number
       let cleanStars = "";
       for (let i=0; i < numStars; i++){
        cleanStars += "&#127775 "; 
       }

       // Call the renderClassicHeader function to stuff the set name into the page H1
       // renderClassicHeader(cleanSetName);
       
       // Setup a variable to hold the reference to our Div, 'cause we got work to do!
       let blogBody = document.getElementById("cardSetDiv");
       blogBody.innerHTML += 
                    `
                    <table class="set-details-table-style">
                        <tr>
                            <td style="width:400px;font-size:20px"><strong>${cleanSetName}</strong></td>
                            <td rowspan="7" style="text-align:center"><img src="${cleanHeaderImg}${cleanHeaderImgName}" class="table-header-img"></img></td>
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
                            <td><strong><i>Formats:</i></strong> ${cleanFormats} </td>
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
                            <img src="${cleanFooterImg}${cleanFooterImgName}" class="table-footer-img"></img>
                            </td>
                        </tr>
                    </table>
                   <br> 
                   <hr/> 
                   <br>
                   <br>`;
   }




 /**
    * Registration function
    * Checks first of reCAPTCHA was submitted successfully
    * Check to see if user has already registered by looking for an existing email address
    */

 function submitRegistration(token,userName,password,firstName,lastName,email,favTeam) {
    // Dee Bug
    // console.log(`In submitRegistration! Token is ${token}`);

     // Let's change the state of the button, now that we've clicked it...
   //  submitButtonClicked();

    // Now start a timer and change the button state to reflect the submit event, waiting X milliseconds
    // Because the timer is longer, usually, then the amount of time it takes to call the API (which then waits for the result)
    // this makes it look like the button is waiting for the modal to close first :-)
   // submitButtonReset();

    // First, check the value of token - if it's an empty string the User has not attempted the reCAPTCHA challenge

    if (token === "unset") {
        // reCAPTCHA has not been attempted
        alert("Click the reCAPTCHA first!");
        // ERROR - let's get outta here...
        return;
    }
    else {
        console.log(`Token is not null: reCAPTCHA token is: ${token}`);

        // reCAPTCHA is good, let's be sure our required fields are filled out
        if (userName === "" || password === "") {
            alert("please fill out the required fields!");
            // ERROR - bail out
            return;
            }
        } 


// *********** NOT USED *************************

        // ************ TO DO - create Lambda to run verification **********************
        // We need to go one step further here and validate the token by calling:
        // https://www.google.com/recaptcha/api/siteverify METHOD: POST
        // passing in the site's Secret key & the response token
        // Otherwise a user could submit using the same token
        
        // Next, call the Lambda function to populate the database
        // Dee Bug
        console.log(`Form Data: ${userName}, ${password}, ${firstName}, ${lastName}, ${email}, ${favTeam}`)
       
        // ********************* createUser API CALL ********************
        // instantiate a headers object
        let myHeaders = new Headers();
        
        // add content type header to object plus access control
        myHeaders.append("Content-Type", "application/json");

        // using built in JSON utility package turn object to string and store in a variable
        let raw = JSON.stringify({"userName":userName,"password":password,"firstName":firstName,"lastName":lastName,"email":email,"favTeam":favTeam});
        // Dee Bug
        console.log(`JSON Data: ${raw}`);

        // create a JSON object with parameters for API call and store in a variable
        let requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
        };

        // make API call to createUser endpoint with parameters and use promises to get response
        fetch("https://ztohvgibd7.execute-api.us-east-2.amazonaws.com/dev", requestOptions)
        .then(response => response.text())
        .then(result => alert(JSON.parse(result).body))
        .catch(error => console.log('error', error));

    }