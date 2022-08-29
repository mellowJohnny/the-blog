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
       // 'data' is an Object at this point...this is basically the record set returned bt dynamoDB
       // First let's return an array of the object's properties
           const returnedData = Object.entries(data); 
         
       // Next let's just get the 'body' property returned by the Lambda call
          for (const [key, value] of returnedData) {
              if (key === "body"){
                // Now that we have the 'body' key, we need to convert the value 
                // (currently a JSON String) to a JSON Object 
                // so that we can pull out the properties of each blog post 
               const blogPostObject = JSON.parse(value);

                // A Little debug:
                // console.log(returnedData);

                // Let's sort the Object by 'time' - newest blogs first
                // If you want to reverse the sort order, switch the return values to 1 and -1 respectively
               function getSortOrder(property) {    
                return function(a, b) {    
                    if (a[property] > b[property]) {    
                        return -1;    
                    } else if (a[property] < b[property]) {    
                        return 1;    
                    }    
                    return 0;    
                }    
             } 

            // Call getSortOrder, passing the attribute we want to sort on
            // Remember, "Items" is the array of JSON-formatted blogPosts
            // NOTE: The Array.sort() method mutates the array in place, so the array is re-ordered right away - no need to make a copy
            blogPostObject.Items.sort(getSortOrder("time"));     
    
            // Now that the data we got back is a JSON object, let's loop over all the Posts...
            // The 'Items' property holds an array of all the blog posts. Let's loop through that array and display the fields we want!
            // We call the displayBlog() function to control the display of the blog post
            // It gets called it once for each blog post, formatting each blog post one at a time
         
            for (var i = 0; i < blogPostObject.Items.length; i++) {
                displayBlog(blogPostObject.Items[i].postBody,
                    blogPostObject.Items[i].author,
                    blogPostObject.Items[i].time,
                    blogPostObject.Items[i].title,
                    blogPostObject.Items[i].img);
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
 */

   function displayBlog(postBody, author, date, title, img) {
       // Populate the blogsDiv...
 
       // Cleanup the JSON we get back so it's back to a String 
       // We parsed the first object we got back (the outer DynamoDB record), but that didn't parse the contents 
       // of the inner properties. 
       // We need to explicitly parse title, author, and the blog
       const cleanTitle = JSON.parse(title);
       const cleanAuthor = JSON.parse(author);
       const cleanPostBody = JSON.parse(postBody);
       const cleanImg = JSON.parse(img);

       // Format the Date by passing it to our Magic Date fixer...
       fixDate(date);
        
       // Setup a variable to hold the reference to our Div, 'cause we got work to do!
       let blogBody = document.getElementById("blogsDiv");
       blogBody.innerHTML += 
                    `<h1 class="blog-title">${cleanTitle}</h1> 
                    <strong><i>${cleanAuthor} </i></strong>
                    <br>
                    <strong><i>${fixDate(date)}</i></strong> 
                    <br>
                    ${cleanPostBody} 
                    <br>
                    <img src="${cleanImg}" class="blog-img"></img>
                    <br>
                    <hr/>
                    <br>`;
   }

/*********************************************** fetchCardSetsByYear *************************************/

 /** 
    * This function calls an underlying AWS call used to FETCH ALL card sets given a specific year
    * AWS API Gateway API call - getCardSets end-point
    * Called on page load from various pages
  */

  function fetchCardSetsByYear(year, pageName) {
    // Set the Global pageName variable
    globalPageName = pageName;

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
       const cleanHeaderImgName = JSON.parse(headerImgName);
       const cleanFooterImg = JSON.parse(footerImg);
       const cleanFooterImgName = JSON.parse(footerImgName);
       const cleanSetName = JSON.parse(setName);

       // Now that we have the name of the set, render one of two versions of the Header in the HTML page...
        if (pageName === "junkWax") {
            renderJunkWaxHeader(cleanYear);
        }
        else {
            renderClassicWaxHeader(cleanSetName);
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


/* 
    Function called to dynamically render the junk wax style H1 pager header.
*/
function renderJunkWaxHeader(year) {
    let pageHeader = document.getElementById("pageHeader");
    pageHeader.innerHTML = `...card sets from ${year}`;
}

/* 
    Function called to dynamically render the classic set H1 pager header.
*/
function renderClassicWaxHeader(setName) {
    let pageHeader = document.getElementById("classicPageHeader");
    pageHeader.innerHTML = `...classic 80s sets: ${setName}`;
}



   // ----------------------------- Date Helper Functions ----------------------------

   /**
    * Formats our Raw Date object coming back from the JSON response
    * @param {*} date 
    * @returns 
    */

   function fixDate(date){
    const d = new Date(date);
    // Get the day of the week as an Integer, then convert it to the name of the day
    const dayNum = d.getDay();
    const weekDay = getDayOfTheWeek(dayNum);

    // Get the month as an Integer, convert it to the name
    const monthNum = d.getMonth(); 
    const month = getMonthName(monthNum);
    // Get the year
    const year = d.getFullYear(); 

    // Gets the day of the month
    const dateNum = d.getDate(); 

    // Smoosh it all together and send it back...
    return weekDay + ", " + month + " " + dateNum + ", " + year;
}

   /**
 * Helper function to get the month name, given an Integer value
 * @param {*} month 
 */
    function getMonthName(monthNum){
        if (monthNum === 0){
            month = "January";
            return month;
        }
        if (monthNum === 1){
            month = "February";
            return month;
        }
        if (monthNum === 2){
            month = "March";
            return month;
        }
        if (monthNum === 3){
            month = "April";
            return month;
        }
        if (monthNum === 4){
            month = "May";
            return month;
        }
        if (monthNum === 5){
            month = "June";
            return month;
        }
        if (monthNum === 6){
            month = "July";
            return month;
        }
        if (monthNum === 7){
            month = "August";
            return month;
        }
        if (monthNum === 8){
            month = "September";
            return month;
        }
        if (monthNum === 9){
            month = "October";
            return month;
        }
        if (monthNum === 10){
            month = "November";
            return month;
        }
        if (monthNum === 11){
            month = "December";
            return month;
        }
    }

/**
 * Helper function to get the day name, given an Integer value
 * @param {*} day 
 */
     function getDayOfTheWeek(dayNum){

        if (dayNum === 1){
            dayName = "Monday";
            return dayName;
        }
        if (dayNum === 2){
            dayName = "Tuesday";
            return dayName;
        }
        if (dayNum === 3){
            dayName = "Wednesday";
            return dayName;
        }
        if (dayNum === 4){
            dayName = "Thursday";
            return dayName;
        }
        if (dayNum === 5){
            dayName = "Friday";
            return dayName;
        }
        if (dayNum === 6){
            dayName = "Saturday";
            return dayName;
        }
        if (dayNum === 0){
            dayName = "Sunday";
            return dayName;
        }
    }

    /**
    * Registration function
    * Checks first of reCAPTCHA was submitted successfully
    * Check to see if user has already registered by looking for an existing email address
    */

    function submitRegistration() {
        // First make sure reCAPTCHA was submitted successfully
        console.log("Registration Submitted!")

        // Set up a global variable to hold the API URL
        const urlToFetch = `https://www.google.com/recaptcha/api/siteverify METHOD: POST`;
          
    fetch(urlToFetch)
       .then(function (response) {
           const jsonResponse = response.json();
           return jsonResponse; // Our Promise object
       })
       .then(function (data) {
       // 'data' is an Object at this point...this is basically the record set returned bt dynamoDB
       // First let's return an array of the object's properties
           const returnedData = Object.entries(data); 

    }
