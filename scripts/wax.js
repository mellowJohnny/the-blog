/** Global Pagination Variables */
let allCardSets = []; // Used in pagination - holds all the Card Sets so we can paginate through it
let currentPage = 1; // Which Card Set to start with
const pageSize = 1; // how many blogs to display at a time

/** **
 * Card Intro Text Render-O-Matic
 */

function renderCardIntro(pageName) {

  let introHTML = "";

  if (pageName === "classicWax") {
    introHTML = `
       <h2>Classic '80s Sets</h2>
      <p>The O-Pee-Chee sets from Gretzky's debut in the 1979-80 set right up to the Roy and Lemieux years defined a classic period of card collecting. The 8 sets from the pre-boom era include not only Gretzky, Roy, and Lemieux but also Messier, Bourque, Coffey, Savard, Fuhr, Hawerchuck, Carbonneau, Yzerman, Gilmour, and MacInnis. Quite a Hall of Fame class.</p>
    `;
  } else if (pageName === "junkWax") {
    introHTML = `
      <h2>Junk Wax Sets</h2>
      <p>The late '80s and early '90s...Miami Vice, acid wash jeans, and teal San Jose Sharks jerseys...and a hockey card explosion. Consider this: the 1989-90 season had just two licensed hockey sets - Topps in the US and O-Pee-Chee in Canada. But just a few years later there were thirteen licensed sets, ushering in the <i><a href="cards.html">Junk Wax</a></i> era.<br><br> But there are some hidden gems to be found if you are willing to dig around a bit...</p>
    `;
  } else if (pageName === "timmies") {
    introHTML = `
      <h2>Tim Hortons Upper Deck Sets</h2>
      <p>When McDonald's Canada shut down their association with the NHL in 2010, nearly 20 years of fast food hockey card collecting went with it. But in 2015, after a five year absence, fast food hockey card collecting was back! Tim Hortons, the bastion of blue-collar coffee shops, released their very first NHL Hockey set for the 2015-16 season. <br><br>But they didn't just mail it in - it was a modern, 100 card Upper Deck base set, complete with custom binder and loads of chase cards.  Released just after the season starts in October, it has become an annual tradition in Canada</p>
    `;
  } else if (pageName === "mcd") {
    introHTML = `
      <h2>McDonald's Canada Hockey</h2><p>McDonald's Canada launched the very first "All Star" set during the 1991-92 NHL season, and continued the tradition for the next 18 seasons, finally ending in 2009. And while there was no 2010-11 set, there was one final McKick at the can - a one-off Montreal Canadiens Upper Deck set in 2011-12.</p><p>Early McHockey sets were relatively small All-Star game retrospectives, but over time sets grew in size and dropped the All-Star focus, becoming "regular" hockey sets. </p>
    `;
  }
    const introEl = document.getElementById("card-intro");
      if (introEl) {
        introEl.innerHTML = introHTML;
      }
  }// end renderCardIntro()

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
    // Populate the page title
    fetchPageTitle(item.setName);
    console.log(`In fetchPageTitle: ${item.setName}`);
  });

  renderPaginationControls();
}

fetchPageTitle(setName) 
{
  let pageTitle = document.getElementById("pageTitle");

    pageTitle.innerHTML += `
    <title>${setName}</title>
    `;
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