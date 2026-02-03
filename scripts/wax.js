/** Global Pagination Variables */
let allCardSets = []; // Used in pagination - holds all the Card Sets so we can paginate through it
let currentPage = 1; // Which Card Set to start with
const pageSize = 1; // how many blogs to display at a time

/** Fetch the Intro text based on pageName param: classicWax, junkWax, timmies, mcdonalds */
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

    fetch(urlToFetch)
        .then(response => response.json())
        .then(data => {

            // Lambda returns an array, not { Items: [...] }
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

            // Store results for pagination
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
 * Function to FORMAT & DISPLAY card sets
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
    const readingStats = estimateReadingTime(postBody); // lives in helper.js

    // Reference to the div where everything goes
    let cardBody = document.getElementById("cardSetDiv");

    cardBody.innerHTML += `
        <table class="set-details-table-style">
            <tr>
                <td style="width: 25%; font-size: 20px;">
                    <strong>${setName}</strong>
                </td>
                <td rowspan="7" class="header-img-cell" style="width: 75%; text-align: center;">
                    <img src="${headerImg}${headerImgName}" 
                    class="table-header-img" 
                    fetchpriority="high"
                    alt="Vintage hockey cards from the ${year} ${mfg} set"
                    width="620"
                    height="285">
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
                <strong><i>${author}, ${fixDate(date)}</i></strong><br>
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
                    <img src="${footerImg}${footerImgName}" 
                    class="table-footer-img" 
                    loading="lazy" 
                    alt="Vintage hockey cards from the ${year} ${mfg} set"
                    width="890"
                    height="325">
                </td>
            </tr>
        </table>

        <br>
        <hr/>
        <br><br>
    `;
}


/**
 * Pagination controls
 * This function is used to control how we paginate 
 * Uses the Global variables for "where to start" (currentPage) and "how many to display" (pageSize) 
 * Uses set name for 'next' and 'previous' hyperlinks
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