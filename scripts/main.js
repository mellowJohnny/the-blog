/**
 * There are two main functions here used to either fetch Blogs or Card Sets
 * 1. fetchBlogs() is responsible for fetching all blogs given a blogType parameter, then sorts the results
 * 2. fetchCardSetsByYear() is responsible for fetching all Card Sets given a year parameter
 */

// Pagination Global Variables
var globalPageName = "";
let allBlogs = []; // Used in pagination - holds all the Blogs so we can paginate through it
let currentBlogPage = 1; // Which Blog to start with
const blogPageSize = 1; // how many blogs to display at a time

let allCardSets = []; // Used in pagination - holds all the Card Sets so we can paginate through it
let currentPage = 1; // Which Card Set to start with
const pageSize = 1; // how many blogs to display at a time


/************************** fetchBlogs() Function, also orders the results via getSortOrder ****************/

 /** 
    * This function calls an underlying AWS call used to FETCH ALL BLOG POSTS
    * AWS Lambda call - getBlogs end-point
    * Called from the index.html page
  */

  function fetchBlogs(blogType) {
  fetch(`https://qeb63ean2e.execute-api.us-east-2.amazonaws.com/dev?blogType=${blogType}`)
    .then(res => res.json())
    .then(blogArray => {

      if (!Array.isArray(blogArray)) {
        throw new Error("API did not return an array");
      }

      // Sort blogs
      if (blogType === "5") {
        blogArray.sort(getSortOrder("time", "last"));   // Most recent last
      } else {
        blogArray.sort(getSortOrder("time", "first"));  // Most recent first
      }

      // Store full dataset for pagination
      allBlogs = blogArray;
      currentBlogPage = 1;

      renderBlogPage();
    })
    .catch(err => console.error("FETCH ERROR:", err));
}


/** 
 * Pagination Renderer
 * This is where we call displayBlog
 */

function renderBlogPage() {
  const blogDiv = document.getElementById("blogsDiv");
  blogDiv.innerHTML = "";

  const start = (currentBlogPage - 1) * blogPageSize;
  const end = start + blogPageSize;
  const pageItems = allBlogs.slice(start, end);

  pageItems.forEach(blog => {
    displayBlog(
      blog.postBody,
      blog.author,
      blog.time,
      blog.title,
      blog.img,
      blog.imgCap
    );
  });

  renderBlogPaginationControls(start, end);
}

/**
 * Blog-specific pagination controls
 */

function renderBlogPaginationControls(start, end) {
  const controls = document.getElementById("paginationControls");
  controls.innerHTML = "";

  const prevBlog = allBlogs[start - 1];
  const nextBlog = allBlogs[end];

  const prevLabel = prevBlog ? `← ${prevBlog.title}` : "← Previous";
  const nextLabel = nextBlog ? `${nextBlog.title} →` : "Next →";

  const totalPages = Math.ceil(allBlogs.length / blogPageSize);

  controls.innerHTML = `
    <a onclick="prevBlogPage()" class="pagination-link ${currentBlogPage === 1 ? "disabled" : ""}">
      ${prevLabel}
    </a>

    <span class="pagination-page">Page ${currentBlogPage} of ${totalPages}</span>

    <a onclick="nextBlogPage()" class="pagination-link ${currentBlogPage === totalPages ? "disabled" : ""}">
      ${nextLabel}
    </a>
  `;
}

/**
 * Blog-specifc Next & Previous controls
 */

function nextBlogPage() {
  const totalPages = Math.ceil(allBlogs.length / blogPageSize);
  if (currentBlogPage < totalPages) {
    currentBlogPage++;
    renderBlogPage();
    document.getElementById("blog-intro").scrollIntoView({ behavior: "smooth" }); // was getElementbyId(blogTop)
  }
}

function prevBlogPage() {
  if (currentBlogPage > 1) {
    currentBlogPage--;
    renderBlogPage();
    document.getElementById("blog-intro").scrollIntoView({ behavior: "smooth" });
  }
}



// ****************************************** displayBlog Helper Function *****************************

/**
 * Function to FORMAT & DISPLAY Blogs posts
 * NOTE! We now use onerror image handling so any blog with broken images fail gracefully
 * @param {*} postBody 
 * @param {*} author 
 * @param {*} date 
 * @param {*} title 
 * @param {*} img
 * @param {*} imgCap
 */

   function displayBlog(postBody, author, date, title, img, imgCap) {
  const cleanTitle = title;
  const cleanAuthor = author;
  const cleanPostBody = postBody;
  const cleanImg = img;
  const cleanImgCap = imgCap;

  const blogBody = document.getElementById("blogsDiv");
    
  // Let's estimate how long it will take to read this Blog based on its length. 
  // This function lives in hepler.js
  const readingStats = estimateReadingTime(cleanPostBody);


  // If no image was provided at all
  if (cleanImg === "none") {
    blogBody.innerHTML += 
      `<h1 class="blog-title">${cleanTitle}</h1> 
       <strong><i>${cleanAuthor}</i></strong><br>
       <strong><i>${fixDate(date)}</i></strong>
       <strong><i>${readingStats.minutes} minute read</i></strong><br>
       ${cleanPostBody}
       <hr/><br>`;
    return;
  }

  // Otherwise include the image with an onerror handler
  blogBody.innerHTML += 
    `<h1 class="blog-title">${cleanTitle}</h1> 
     <strong><i>${cleanAuthor}</i></strong><br>
     <strong><i>${fixDate(date)}</i></strong><br>
     <strong><i>${readingStats.minutes} minute read</i></strong><br>
     ${cleanPostBody}
     <img src="${cleanImg}" class="blog-img"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='none';">
     <br>
     <i>${cleanImgCap}</i>
     <hr/><br>`;
}


/********************************************************************************************************* */
/*********************************************** fetchBlogIntroByType *************************************/

 /** 
    * This function calls an underlying AWS call used to FETCH blogs intros given a specific blogType
    * AWS API Gateway API call - getBlogIntro end-point (& getBlogIntro Lambda)
  */

 function fetchBlogIntroByType(blogType) {

   // console.log("In fetchBlog...");
   // console.log(`blogType is: ${blogType}`);

    const urlToFetch = `https://0t14dphgwb.execute-api.us-east-2.amazonaws.com/dev?blogType=${blogType}`;

    fetch(urlToFetch)
        .then(response => response.json())
        .then(data => {
          //  console.log("API returned:", data);

            // DynamoDB returns an object with an Items array
            if (!data.Items || data.Items.length === 0) {
                document.getElementById("blog-intro").innerHTML =
                    "...this blog needs no introduction!!";
                return;
            }

            // Extract the intro text from the first item
            const intro = data.Items[0].introText;

            // Display it
            document.getElementById("blog-intro").innerHTML = intro;
        })
        .catch(err => {
            console.log("Something went wrong:", err);
            document.getElementById("blog-intro").innerHTML =
                "...Ah, Houston, we've had a problem...";
        });
}

function fetchCardIntro(pageName) {
  const urlToFetch = `https://5asiy29hih.execute-api.us-east-2.amazonaws.com/dev?pageName=${pageName}`;

  fetch(urlToFetch)
    .then(response => response.json())
    .then(data => {
      if (!data.introText) {
        document.getElementById("card-intro").innerHTML =
          "...this blog needs no introduction!!";
        return;
      }

      document.getElementById("card-intro").innerHTML = data.introText;
    })
    .catch(err => {
      console.log("Something went wrong:", err);
      document.getElementById("card-intro").innerHTML =
        "...Ah, Houston, we've had a problem...";
    });
}




/*********************************************** fetchCardSetsByYear *************************************/

 /** 
    * This function calls an underlying AWS call used to FETCH ALL card sets given a specific year
    * AWS API Gateway API call - getCardSets end-point
    * Called on page load from various pages
    * NEW - Uses pagination
  */

 function fetchCardSetsByYear(year, sortOrder) {

    const urlToFetch = `https://a92dwyl3ic.execute-api.us-east-2.amazonaws.com/dev?year=${year}`;

    fetch(urlToFetch)
        .then(response => response.json())
        .then(data => {
          //  console.log("API returned:", data);

            // No results?
            if (!data.Items || data.Items.length === 0) {
                document.getElementById("cardSetDiv").innerHTML =
                    "...this set has yet to be reviewed";
                return;
            }

            // Sorting
            if (sortOrder === "last") {
                data.Items.sort(cardSetSorter("stars", "last"));
            } else {
                data.Items.sort(cardSetSorter("stars", "first"));
            }

            // ⭐ Instead of calling displayCardSet() here,
            // ⭐ we store the results and let pagination render them.
            allCardSets = data.Items;
            currentPage = 1;
            renderCardSetPage();
        })
        .catch(err => {
            document.getElementById("cardSetDiv").innerHTML =
                "...Ah, Houston, we've had a problem...";
            console.log("Something went wrong:", err);
        });
}

/**
 * Used by the pagination method - acts as a middleman to paginate, then for each set to be rendered on the page
 * it calls the original displayCardSet() function to render the set
 */

function renderCardSetPage() {
  const container = document.getElementById("cardSetDiv");
  container.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  const pageItems = allCardSets.slice(start, end);

  // ⭐ THIS is where your original function is called
  pageItems.forEach(item => {
    displayCardSet(
      item.postBody,
      item.year,
      item.mfg,
      item.size,
      item.subsets,
      item.stars,
      item.formats,
      item.headerImg,
      item.headerImgName,
      item.footerImg,
      item.footerImgName,
      item.setName
    );
  });

  renderPaginationControls();
}

/**
 * New pagination controls
 * This function is used to control how we paginate using the Global variables for "where to start" (currentPage)
 * and "how many to display" (pageSize) 
 * Also dynamically displays the actual set name as the next and previous buttons
 */

function renderPaginationControls() {
  const totalPages = Math.ceil(allCardSets.length / pageSize);
  const controls = document.getElementById("paginationControls");

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize - 1;

  // Determine previous and next set names
  const prevSet = allCardSets[start - 1];
  const nextSet = allCardSets[end + 1];

  const prevLabel = prevSet ? `← Back To:: ${prevSet.setName}` : "← Previous";
  const nextLabel = nextSet ? `Next Up: ${nextSet.setName} →` : "Next →";

  controls.innerHTML = `
    <a 
      href="javascript:void(0)" 
      onclick="prevPage()" 
      class="pagination-link ${currentPage === 1 ? "disabled" : ""}"
    >
      ${prevLabel}
    </a>

    <span class="pagination-page">Page ${currentPage} of ${totalPages}</span>

    <a 
      href="javascript:void(0)" 
      onclick="nextPage()" 
      class="pagination-link ${currentPage === totalPages ? "disabled" : ""}"
    >
      ${nextLabel}
    </a>
  `;
}



/**
 * Next and Previous functions
 * Functions ensure that when we navigate forward or back, we are always back at the top
 */

function nextPage() {
  const totalPages = Math.ceil(allCardSets.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderCardSetPage();
    document.getElementById("card-intro").scrollIntoView({ behavior: "smooth" });
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderCardSetPage();
    document.getElementById("card-intro").scrollIntoView({ behavior: "smooth" });
  }
}


/**
 * Function to FORMAT & DISPLAY card sets, including Flip Card CSS
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

   function displayCardSet(postBody,year,mfg,size,subsets,stars,formats,headerImg,headerImgName,footerImg,footerImgName,setName) 
   {
    // Convert stars to a number
    const numStars = parseInt(stars);

    // Generate star emojis
    let cleanStars = "";
    for (let i = 0; i < numStars; i++) {
        cleanStars += "&#127775; ";
    }

    // Reference to the div where everything goes
    let cardBody = document.getElementById("cardSetDiv");

    cardBody.innerHTML += `
        <table class="set-details-table-style">
            <tr border="1">
                <td style="width: 38%; font-size: 18px;">
                    <strong>${setName}</strong>
                </td>
                <td rowspan="7" style="width: 62%; text-align: center;">
                    <img src="${headerImg}${headerImgName}" class="table-header-img" loading="lazy">
                </td>
            </tr>

            <tr>
                <td><strong><i>Set Size:</i></strong> ${size} cards</td>
            </tr>
            <tr>
                <td><strong><i>Inserts:</i></strong> ${subsets}</td>
            </tr>
            <tr>
                <td><strong><i>Release Year:</i></strong> ${year}</td>
            </tr>
            <tr>
                <td><strong><i>Formats:</i></strong> ${formats}</td>
            </tr>
            <tr>
                <td><strong><i>Manufacturer:</i></strong> ${mfg}</td>
            </tr>
            <tr>
                <td><strong><i>Hella Rating:</i></strong> ${cleanStars}</td>
            </tr>
        </table>

        <div class="set-html">
          ${postBody}
        </div>

        <table class="set-footer-table-style">
            <tr>
                <td style="text-align:left" class="caption">
                    <strong>...and the winners are...</strong>
                </td>
            </tr>
            <tr>
                <td style="text-align:center">
                    <img src="${footerImg}${footerImgName}" class="table-footer-img" loading="lazy">
                </td>
            </tr>
        </table>

        <br>
        <hr/>
        <br><br>
    `;
}


/**
    * Card Header function
    * called by the waxReviews page to display a category-specific page header
    * Possible values for pageName are 'junkWax', 'classicWax' or 'timmies'
    * Called from waxReviews.html using the pageName and year URL parameters
    * ******* NOTE NOTE NOTE ******** NOT called anymore
*/

/** 
function displayCardHeader(pageName,year) {
    if (pageName === "junkWax") {
        let pageHeader = document.getElementById("pageHeader");
        pageHeader.innerHTML = `...junk wax sets from ${year}`;
    }
    if (pageName === "timmies") { 
        let pageHeader = document.getElementById("pageHeader");
        pageHeader.innerHTML = `...timmies sets: ${year}`;
    }
    if (pageName === "classicWax")  {
       let pageHeader = document.getElementById("pageHeader");
        pageHeader.innerHTML = `...classic wax: ${year}`;
    }

}

*/

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
       // console.log(`Form Data: ${userName}, ${password}, ${firstName}, ${lastName}, ${email}, ${favTeam}`)
       
        // ********************* createUser API CALL ********************
        // instantiate a headers object
        let myHeaders = new Headers();
        
        // add content type header to object plus access control
        myHeaders.append("Content-Type", "application/json");

        // using built in JSON utility package turn object to string and store in a variable
        let raw = JSON.stringify({"userName":userName,"password":password,"firstName":firstName,"lastName":lastName,"email":email,"favTeam":favTeam});
        // Dee Bug
       // console.log(`JSON Data: ${raw}`);

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