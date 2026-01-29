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

 function fetchCardSetsByYear(year, sortOrder, blogCat) {

    const urlToFetch = `https://a92dwyl3ic.execute-api.us-east-2.amazonaws.com/dev?year=${year}&blogCat=${blogCat}`;

    console.log(`In fetchCardSetsByYear, blogCat is: ${blogCat}`);

    fetch(urlToFetch)
        .then(response => response.json())
        .then(data => {
            console.log("API returned:", data);

            // ⭐ NEW: Lambda now returns an array, not { Items: [...] }
            if (!Array.isArray(data) || data.length === 0) {
                document.getElementById("cardSetDiv").innerHTML =
                    "...this set has yet to be reviewed";
                return;
            }

            // Sorting
            if (sortOrder === "last") {
                data.sort(cardSetSorter("stars", "last"));
            } else {
                data.sort(cardSetSorter("stars", "first"));
            }

            // ⭐ Store results for pagination
            allCardSets = data;
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
      item.setName,
      item.author,
      item.now
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

   function displayCardSet(postBody,year,mfg,size,subsets,stars,formats,headerImg,headerImgName,footerImg,footerImgName,setName, author,date) 
   {
    // Convert stars to a number
    const numStars = parseInt(stars);

    // Generate star emojis
    let cleanStars = "";
    for (let i = 0; i < numStars; i++) {
        cleanStars += "&#127775; ";
    }

    // Calculate Reading Time
    const readingStats = estimateReadingTime(postBody);

    // Reference to the div where everything goes
    let cardBody = document.getElementById("cardSetDiv");

    cardBody.innerHTML += `
        <table class="set-details-table-style">
            <tr>
                <td style="width: 25%; font-size: 20px;">
                    <strong>${setName}</strong>
                </td>
                <td rowspan="7" style="width: 75%; text-align: center;">
                    <img src="${headerImg}${headerImgName}" class="table-header-img" loading="lazy">
                </td>
            </tr>

            <tr>
                <td><strong><i>Set Size:</i></strong> ${size}</td>
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
        <br>
        <table class="set-details-author">
          <tr>
            <td>
                <strong><i>${author}</i></strong><br>
                <strong><i>${fixDate(date)}</i></strong><br>
                <strong><i>${readingStats.minutes} minute read</i></strong>
            </td>
          </tr>
          <tr>
            <td>${postBody}</td>
          </tr>
        </table>

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


