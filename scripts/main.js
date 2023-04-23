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
                //console.log(returnedData);
             
            // Next all getSortOrder, passing the attribute we want to sort on. Remember, "Items" is the array of JSON-formatted blogPosts
            // If the blogType passed in from the page is 3 (mach-e blogs) lets display oldest blogs first, for everything else, order newest first 
            if (blogType === "3") {
               // We want to sort Mach-Blogs oldest to newest
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
    pageHeader.innerHTML = `...Junk Wax Sets From ${year}`;
}

/* 
    Function called to dynamically render the classic set H1 pager header.
*/
function renderClassicWaxHeader(setName) {
    let pageHeader = document.getElementById("classicPageHeader");
    pageHeader.innerHTML = `...Classic 80s Set: ${setName}`;
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
    
			

    // ************* Helper functions to change CMS Submit state *************

    // Change the submit button colour & text on Submit
    function submitButtonClicked() {
        document.getElementById('regSubmitButton').style.backgroundColor = "#36a5e6";
        document.getElementById('regSubmitButton').innerHTML = "Crossing Fingers...";
    }

    // Post-Submit - change the CREATE submit button colour & text back to initial state 
    function submitButtonReset() {
        setTimeout(changeMeBack, 1500);
    }

    function changeMeBack(){
        document.getElementById('regSubmitButton').style.backgroundColor = "#256386";
        document.getElementById('regSubmitButton').innerHTML = "sign Me UP!";
    }


    //************ Helper Function To Generate Copyright Date for any <div id="copy"> tag ********************
    function fetchCopyrightYear() {
        const copyYear = new Date().getFullYear();
        let copyFooter = document.getElementById("copy");
        copyFooter.innerHTML = `<p>&copy; ${copyYear} Christian Couillard </p>`;
        
    }

    //****** Helper Function For Rendering "smart" Classic Set-O-Matic Year Picker (removes link for current year) *********
    function renderClassicPicker(pickerYear){
        let year = pickerYear;
        let setPicker = document.getElementById("classic-set-picker");
        if (year === "1979"){
            setPicker.innerHTML = `
            <table class="card-set-nav">
                <tr>
                    <td class="classic-set-nav-td">1979-80</td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1980">1980-81</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1981">1981-82</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1982">1982-83</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1983">1983-84</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1984">1984-85</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1985">1985-86</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1986">1986-87</a></td>
                </tr>
            </table>`;
        }
        else if (year === "1980") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                <tr>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1979">1979-80</a></td>
                    <td class="classic-set-nav-td">1980-81</td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1981">1981-82</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1982">1982-83</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1983">1983-84</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1984">1984-85</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1985">1985-86</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1986">1986-87</a></td>
                </tr>
            </table>`;
        }
        else if (year === "1981") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                <tr>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1979">1979-80</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1980">1980-81</a></td>
                    <td class="classic-set-nav-td">1981-82</td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1982">1982-83</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1983">1983-84</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1984">1984-85</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1985">1985-86</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1986">1986-87</a></td>
                </tr>
            </table>`;
        }
        else if (year === "1982") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                <tr>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1979">1979-80</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1980">1980-81</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1981">1981-82</a></td>
                    <td class="classic-set-nav-td">1982-83</td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1983">1983-84</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1984">1984-85</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1985">1985-86</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1986">1986-87</a></td>
                </tr>
            </table>`;
        }
        else if (year === "1983") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                <tr>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1979">1979-80</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1980">1980-81</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1981">1981-82</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1982">1982-83</a></td>
                    <td class="classic-set-nav-td">1983-84</td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1984">1984-85</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1985">1985-86</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1986">1986-87</a></td>
                </tr>
            </table>`;
        }
        else if (year === "1984") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                <tr>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1979">1979-80</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1980">1980-81</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1981">1981-82</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1982">1982-83</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1983">1983-84</a></td>
                    <td class="classic-set-nav-td">1984-85</td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1985">1985-86</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1986">1986-87</a></td>
                </tr>
            </table>`;
        }
        else if (year === "1985") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                <tr>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1979">1979-80</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1980">1980-81</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1981">1981-82</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1982">1982-83</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1983">1983-84</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1984">1984-85</a></td>
                    <td class="classic-set-nav-td">1985-86</td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1986">1986-87</a></td>
                </tr>
            </table>`;
        }
        else if (year === "1986") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                <tr>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1979">1979-80</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1980">1980-81</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1981">1981-82</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1982">1982-83</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1983">1983-84</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1984">1984-85</a></td>
                    <td class="classic-set-nav-td"><a href="/classicWax.html?year=1985">1985-86</a></td>
                    <td class="classic-set-nav-td">1986-87</td>
                </tr>
            </table>`;
        }
    } // End Classic Wax Picker



    //****** Helper Function For Rendering "smart" Junk Wax Set-O-Matic Year Picker (removes link for current year) *********
    function renderJunkPicker(pickerYear){
        let year = pickerYear;
        let setPicker = document.getElementById("junk-wax-picker");
        if (year === "1987"){
            setPicker.innerHTML = `
            <table class="card-set-nav">
                    <tr>
                        <td class="junk-set-nav-td">1987-88</td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1988">1988-89</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1989">1989-90</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1990">1990-91</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1991">1991-92</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1992">1992-93</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1993">1993-94</a></td> 
                    </tr>
                  </table>`;
        }
        else if (year === "1988") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                    <tr>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1987">1987-88</a></td>
                        <td class="junk-set-nav-td">1988-89</td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1989">1989-90</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1990">1990-91</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1991">1991-92</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1992">1992-93</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1993">1993-94</a></td> 
                    </tr>
                  </table>`;
        }
        else if (year === "1989") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                    <tr>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1987">1987-88</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1988">1988-89</a></td>
                        <td class="junk-set-nav-td">1989-90</td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1990">1990-91</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1991">1991-92</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1992">1992-93</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1993">1993-94</a></td> 
                    </tr>
                  </table>`;
        }
        else if (year === "1990") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                    <tr>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1987">1987-88</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1988">1988-89</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1989">1989-90</a></td>
                        <td class="junk-set-nav-td">1990-91</td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1991">1991-92</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1992">1992-93</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1993">1993-94</a></td> 
                    </tr>
                  </table>`;
        }
        else if (year === "1991") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                    <tr>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1987">1987-88</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1988">1988-89</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1989">1989-90</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1990">1990-91</a></td>
                        <td class="junk-set-nav-td">1991-92</td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1992">1992-93</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1993">1993-94</a></td> 
                    </tr>
                  </table>`;
        }
        else if (year === "1992") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                    <tr>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1987">1987-88</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1988">1988-89</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1989">1989-90</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1990">1990-91</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1991">1991-92</a></td>
                        <td class="junk-set-nav-td">1992-93</td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1993">1993-94</a></td> 
                    </tr>
                  </table>`;
        }
        else if (year === "1993") {
            setPicker.innerHTML = `
            <table class="card-set-nav">
                    <tr>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1987">1987-88</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1988">1988-89</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1989">1989-90</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1990">1990-91</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1991">1991-92</a></td>
                        <td class="junk-set-nav-td"><a href="/junkWax.html?year=1992">1992-93</a></td>
                        <td class="junk-set-nav-td">1993-94</td> 
                    </tr>
                  </table>`;
        }
    } // End Junk Wax Picker

// -------------------- Helper Function for Sorting Blog Posts ----------------------
// When "order" is "first", newest blogs first
// When "order" is "last", oldest blogs first
// Default is newest blogs first

function getSortOrder(property,order) {    
    return function(a, b) {    
        if (a[property] > b[property]) { 
            if (order === "first") {
                return -1;
            }  
            else if (order === "last") {
                return 1;
            }
            else {
                return -1;
            }
                
        } else if (a[property] < b[property]) { 
            if (order === "first") {
                return 1;
            }  
            else if (order === "last") {
                return -1;
            }
            else {
                return 1;
            }    
        }   
        else {
            if (a[property] > b[property]) { 
                if (order === "first") {
                    return -1;
                }  
                else if (order === "last") {
                    return 1;
                }
                else {
                    return -1;
                }
            } 
        return 0;    
            }    
    }
} // end sort function

// CardSetSorter Function - Sorts blogs by number of stars...
function cardSetSorter(property,order) {    
    return function(a, b) {    
        if (a[property] > b[property]) { 
            if (order === "first") {
                return -1;
            }  
            else if (order === "last") {
                return 1;
            }
            else {
                return -1;
            }
                
        } else if (a[property] < b[property]) { 
            if (order === "first") {
                return 1;
            }  
            else if (order === "last") {
                return -1;
            }
            else {
                return 1;
            }    
        }   
        else {
            if (a[property] > b[property]) { 
                if (order === "first") {
                    return -1;
                }  
                else if (order === "last") {
                    return 1;
                }
                else {
                    return -1;
                }
            } 
        return 0;    
            }    
    }
} // end sort function

function sortByAscending(url) {
    const sortOrder = "?last";
    dynamicLink.innerHTML += 
    `Note: Sets are ordered in decending order (higherst star rating first) - 
    <a href="${url}">click here</a> to the the absolute worst sets first.</p>
    `;
}


