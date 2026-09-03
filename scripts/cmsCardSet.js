

/** This Script defines all the functions used by the CMS section of the site
 * to CREATE, UPDATE, and DELETE hockey card set reviews. Split out of the
 * old cms.js monolith - see scripts/cmsBlog.js for the equivalent blog-post
 * functions, and scripts/cmsImageBrowser.js / scripts/cmsFormUI.js for the
 * shared image-picker and form-UI helpers this depends on.
 */

/**
 * ---------------------------------------------- GLOBAL MAPPING
 * Used for organising card sets by category on the card set list page
 */

const CARDSET_CATEGORY_LABELS = {
  reg:  "Regular Sets",
  tims: "Tim Hortons Sets",
  mcd:  "McDonald's Sets"
};

//*------------------------------------------ Create New Card Set --------------------------------------*

  /**
   * This is the main AWS call used to CREATE a NEW CARDS POST
   * The createCardSet() function is called from the wlcms.html page
   * Calls the createCardSet API exposed by AWS API Gateway
   *
   * @param {*} blogStatus
   * @param {*} setName
   * @param {*} size
   * @param {*} subsets
   * @param {*} stars
   * @param {*} formats
   * @param {*} year
   * @param {*} postBody
   * @param {*} mfg
   * @param {*} headerImgName
   * @param {*} footerImgName
   *
   */

  // NOTE: We don't pass in the textarea content from the form anymore, we call the TinyMCE API to get it
  async function createCardSet(blogStatus, seoPageTitle, seoMetaDesc, seoURLSlug, seoTags, author, setName, size, subsets, stars, formats, year, headerImgName, footerImgName, mfg, blogCat) {

  // Basic client-side validation - setName and year are marked required in
  // the HTML, but the Submit button is type="button" (not type="submit"),
  // so native HTML5 required validation never actually fires; enforce it here instead
  if (!setName || !setName.trim()) {
    await cmsAlert("Set Name is required.");
    document.getElementById("setName").focus();
    return;
  }

  if (!year || !String(year).trim()) {
    await cmsAlert("Release Year is required.");
    document.getElementById("year").focus();
    return;
  }

  // Call the Tiny API to fetch the content from the editor...
  const tinyBody = tinymce.activeEditor.getContent();
  const tinyBodyText = tinymce.activeEditor.getContent({ format: "text" }).trim();

  if (!tinyBodyText) {
    await cmsAlert("Set Review Text is required.");
    tinymce.activeEditor.focus();
    return;
  }

  // Let's change the state of the button, now that we've clicked it...
  cmsButtonSubmit();

  // Now start a timer and change the button state to reflect the submit event, waiting X milliseconds
  // Because the timer is longer, usually, then the amount of time it takes to call the API (which then waits for the result)
  // this makes it look like the button is waiting for the modal to close first :-)
  cmsCreateButtonReset();

  const payload = {
    blogStatus,
    seoPageTitle,
    seoMetaDesc,
    seoURLSlug,
    seoTags,
    author,
    setName,
    size,
    subsets,
    stars,
    formats,
    year,
    postBody: tinyBody,
    mfg,
    headerImgName,
    footerImgName,
    blogCat
  };

  // make API call to cardPost endpoint with parameters and use promises to get response
  getAuthToken().then(token => fetch("https://05uss9ffij.execute-api.us-east-2.amazonaws.com/dev", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify(payload)
  }))
    .then(async response => {
      // Parse JSON safely
      let data;
      try {
        data = await response.json();
      } catch {
        await cmsAlert("Unexpected server response.");
        return;
      }

      // If Lambda returned an error status, show the error
      if (!response.ok) {
        // Lambda error format: { error: "...", details: "..." }
        const errMsg = data.error || data.message || "An unknown error occurred.";
        await cmsAlert(errMsg);
        return;
      }

      // SUCCESS: Lambda decides the message
      // Lambda always returns: { message: "..." }
      await cmsAlert(data.message || "Success, but no message returned from server.");
      window.location.href = "/cms/pickCardSet.html";
    })
    .catch(async error => {
      console.log("Create error:", error);
      await cmsAlert("Network error creating the card set.");
    });
}



//*------------------------------------------------- Update Card Set ----------------------------------------------- *

/**
 * This function is used to UPDATE an existing Card Set review
 * Calls the updateCardSet API which updates the matching record in DynamoDB
 *
 * @param {*} blogStatus
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

function updateCardSet(blogStatus, seoPageTitle, seoMetaDesc, seoURLSlug, seoTags, author, setName, size, subsets, stars, formats, year, headerImgName, footerImgName, mfg)
{
  cmsButtonSubmit();
  cmsUpdateButtonReset();

  const tinyBody = tinymce.activeEditor.getContent();

  const payload = {
    blogStatus,
    seoPageTitle,
    seoMetaDesc,
    seoURLSlug,
    seoTags,
    author,
    setName,
    size,
    subsets,
    stars,
    formats,
    year,
    postBody: tinyBody,
    headerImgName,
    footerImgName,
    mfg
  };

  getAuthToken().then(token => fetch("https://bb8yehibjb.execute-api.us-east-2.amazonaws.com/dev", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify(payload)
  }))
    .then(async response => {
      let data;
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      let message;

      // Normalize all possible shapes
      if (typeof data === "string") {
        message = data;
      } else if (data.message) {
        message = data.message;
      } else if (data.error) {
        message = data.error;
      } else if (data.body) {
        try {
          const parsed = JSON.parse(data.body);
          message = parsed.message || parsed.error || data.body;
        } catch {
          message = data.body;
        }
      }

      // Only default to a positive message when the request actually
      // succeeded - an unrecognized error shape should never silently
      // read as "Update complete."
      if (!message) {
        message = response.ok
          ? "Update complete."
          : `Update failed (status ${response.status}).`;
      }

      await cmsAlert(message);

      // Only leave the page once the update is confirmed successful
      if (response.ok) {
        window.location.href = "/cms/pickCardSet.html";
      }
    })
    .catch(async error => {
      console.log("Update error:", error);
      await cmsAlert("Something went wrong updating the card set.");
    });
}


//* ---------------------------------------------------------------- Delete Card Set ------------------------------------------------------ *

/**
 * This function is used to DELETE an existing Card Set review
 * Calls the deleteCardSet API which removes the matching record from DynamoDB
 * Confirms with the user first since this is destructive and irreversible
 * Cards table key is setName + year, so both are required (setID is
 * also sent along as a safety check the Lambda verifies before deleting)
 *
 * @param {*} setID
 * @param {*} setName
 * @param {*} year
 **/

async function deleteCardSet(setID, setName, year) {
  const ok = await cmsConfirm("Delete this card set? This cannot be undone.");
  if (!ok) return;

  const payload = {
    setID: setID,
    setName: setName,
    year: Number(year)
  };

  getAuthToken().then(token => fetch("https://8q5ly5ixej.execute-api.us-east-2.amazonaws.com/dev", { // deleteCardSetHandler API
    method: "DELETE",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify(payload)
  }))
    .then(response => response.json())
    .then(async result => {
      await cmsAlert(result.message || "Card set deleted.");
      window.location.href = "/cms/pickCardSet.html";
    })
    .catch(async error => {
      console.log("Error deleting card set:", error);
      await cmsAlert("Error deleting card set.");
    });
}


/*********************************************************************************************
 ****************************************** Helper Functions *********************************
 *********************************************************************************************/


//********************************* Fetch All Card Sets For Update **********************************

/**
 * This Function is used to fetch all records from the Card table in DynamoDB with status="OK"
 * It is used by the CMS users to allow Users to select a single set to be updated
 * Calls the getCardSets API exposed by AWS API Gateway
 */

  async function fetchAllCardSets() {
  const urlToFetch = `https://tx7romovbd.execute-api.us-east-2.amazonaws.com/dev`;

  try {
    const token = await getAuthToken();
    const response = await fetch(urlToFetch, { headers: { "Authorization": token } });
    const data = await response.json();

    let cardSets = [];

    if (Array.isArray(data)) {
      cardSets = data;
    } else if (typeof data.body === "string") {
      cardSets = JSON.parse(data.body);
    } else if (Array.isArray(data.body)) {
      cardSets = data.body;
    } else if (Array.isArray(data.Items)) {
      cardSets = data.Items;
    }

    if (!cardSets || cardSets.length === 0) {
      document.getElementById("noBlogsDiv").innerHTML =
        `...no card sets are currently live`;
      return;
    }

    // Sort by blogCat first, then by year (optional but recommended)
    cardSets.sort((a, b) => {
      if (a.blogCat < b.blogCat) return -1;
      if (a.blogCat > b.blogCat) return 1;
      return a.year - b.year;
    });



    const container = document.getElementById("editBlogsDiv");
    container.innerHTML = "";

    let lastCat = null;

    // Render grouped sections
    cardSets.forEach(set => {
      const { setID, setName, blogCat } = set;

      // Insert header when category changes
      if (blogCat !== lastCat) {
        const header = document.createElement("h2");
        header.textContent = CARDSET_CATEGORY_LABELS[blogCat] || "Other";
        header.className = "blog-type-divider";
        container.appendChild(header);

        lastCat = blogCat;
      }

      // Render the card set entry
      displayCardSets(container, setID, setName);
    });

  } catch (err) {
    console.log("Something went wrong:", err);
    document.getElementById("editBlogsDiv").innerHTML =
      `...Ah, Houston, we've had a problem...`;
  }
}

//********************************* Fetch All Staged Card Sets For Update **********************************

/**
 * This Function is used to fetch all records from the Card table in DynamoDB with status="staged"
 * The API limits the data returned to only the name of the card set and it's ID
 * It is used by the CMS users to allow Users to select a single set to be updated
 * Calls the getCardSets API exposed by AWS API Gateway
 */


 async function fetchAllStagedCardSets() {
  const urlToFetch = `https://ecy21wzgkl.execute-api.us-east-2.amazonaws.com/dev`;

  try {
    const token = await getAuthToken();
    const response = await fetch(urlToFetch, { headers: { "Authorization": token } });
    const data = await response.json();

   // console.log("STAGED RAW DATA:", data);

    let stagedSets = [];

    if (Array.isArray(data)) {
      stagedSets = data;
    } else if (typeof data.body === "string") {
      stagedSets = JSON.parse(data.body);
    } else if (Array.isArray(data.body)) {
      stagedSets = data.body;
    } else if (Array.isArray(data.Items)) {
      stagedSets = data.Items;
    }

    if (!stagedSets || stagedSets.length === 0) {
      document.getElementById("noStagedBlogsDiv").innerHTML =
        `(no staged card sets right now)`;
      return;
    }

    // Staged sets created before the blogCat field existed on the create
    // form have no blogCat value at all. Fall back to "reg" (Regular) when
    // a manufacturer is present - the mfg dropdown only ever offers real
    // card companies (O-Pee-Chee, Topps, Upper Deck, etc.), never "Tim
    // Hortons"/"McDonald's" literally, so any set with a manufacturer but
    // no blogCat predates that distinction and is a Regular set.
    stagedSets.forEach(set => {
      if (!set.blogCat && set.mfg) {
        set.blogCat = "reg";
      }
    });

    // Sort by blogCat first, then by year - matches fetchAllCardSets()
    stagedSets.sort((a, b) => {
      if (a.blogCat < b.blogCat) return -1;
      if (a.blogCat > b.blogCat) return 1;
      return a.year - b.year;
    });

    const container = document.getElementById("stagedBlogsDiv");
    container.innerHTML = "";

    let lastCat = null;

    // Render grouped sections - matches fetchAllCardSets()
    stagedSets.forEach(set => {
      const { setID, setName, blogCat } = set;

      // Insert header when category changes
      if (blogCat !== lastCat) {
        const header = document.createElement("h2");
        header.textContent = CARDSET_CATEGORY_LABELS[blogCat] || "Other";
        header.className = "blog-type-divider";
        container.appendChild(header);

        lastCat = blogCat;
      }

      displayStagedCardSets(setID, setName);
    });

  } catch (err) {
    console.log("Something went wrong:", err);
    document.getElementById("noStagedBlogsDiv").innerHTML =
      `...Ah, Houston, we've had a problem...`;
  }
}


//************************************ displayCardSets Helper Function *************************************

  /**
  * Helper function Called by fetchAllCardSets() to apply HTML formatting a Card Set record
  * Used by CMS to present Card Set names to allow for an individual set to be updated, passing the ID to setEdit.html
  *
  * @param {*} setID
  * @param {*} setName
  *
  */

  function displayCardSets(container, setID, setName) {
  container.innerHTML += `
    <table class="set-details-table-style">
      <tr>
        <td style="width:400px;font-size:20px">
          <a href="setEdit.html?setID=${setID}">
            <strong>${setName}</strong>
          </a>
        </td>
      </tr>
    </table>
  `;
}

//************************************ displayStagedCardSets Helper Function *************************************

  /**
  * Helper function Called by fetchAllStagedCardSets() to apply HTML formatting a Card Set record
  * Used by CMS to present Card Set names to allow for an individual set to be updated, passing the ID to setEdit.html
  *
  * @param {*} setID
  * @param {*} setName
  *
  */

  function displayStagedCardSets(setID, setName) {
  const blogBody = document.getElementById("stagedBlogsDiv");

  blogBody.innerHTML += `
    <table class="set-details-table-style">
      <tr>
        <td style="width:400px;font-size:20px">
          <a href="setEdit.html?setID=${setID}">
            <strong>${setName}</strong>
          </a>
        </td>
      </tr>
    </table>
  `;
}

//**************************** Fetch Card Set by ID - Populates the CMS Form For Update **************************

  /**
   * This function fetches a single card set, given it's ID and parses out the individual fields
   * It then calls populateCardSet() which in turn populates the HTML form on setEdit.html
   * Calls the getCardSetByID API exposed by AWS API Gateway
   *
   * @param {*} id
   *
   **/

  function fetchCardSetByID(id) {
  const urlToFetch = `https://733bwunxq6.execute-api.us-east-2.amazonaws.com/dev?setID=${id}`;

  getAuthToken().then(token => fetch(urlToFetch, { headers: { "Authorization": token } }))
    .then(response => response.json())
    .then(data => {

     // console.log("RAW CARD SET BY ID:", data);

      // Normalize the Lambda response
      let items = [];

      if (Array.isArray(data.items)) {
        items = data.items;
      } else if (Array.isArray(data)) {
        items = data;
      } else if (typeof data.body === "string") {
        items = JSON.parse(data.body);
      } else if (Array.isArray(data.body)) {
        items = data.body;
      } else if (Array.isArray(data.Items)) {
        items = data.Items;
      }

      if (!items || items.length === 0) {
        document.getElementById("errorDiv").innerHTML =
          `these aren't the Droids you're looking for...`;
        return;
      }

      // Populate the form with the first (and only) card set
      const set = items[0];

      populateCardSet(
        set.blogStatus,
        set.seoPageTitle,
        set.seoMetaDesc,
        set.seoURLSlug,
        set.seoTags,
        set.author,
        set.postBody,
        set.year,
        set.mfg,
        set.size,
        set.subsets,
        set.stars,
        set.formats,
        set.setName,
        set.headerImgName,
        set.footerImgName
      );
    })
    .catch(err => {
      document.getElementById("errorDiv").innerHTML =
        `...Ah, Houston, we've had a problem...`;
      console.log("Something went wrong:", err);
    });
}

//**************************************** populateCardSet Helper Function **********************************

  /**
  * Helper function Called by fetchCardSetByID()
  * Used by CMS to pre-populate each form field for a given Card Set
  *
  * @param {*} blogStatus
  * @param {*} postBody
  * @param {*} year
  * @param {*} mfg
  * @param {*} size
  * @param {*} subsets
  * @param {*} stars
  * @param {*} formats
  * @param {*} setName
  * @param {*} headerImgName
  * @param {*} footerImgName
  */

  /** This function calls the associated DIV on the Set Update form in setEdit.html and populates it with the current value */
  function populateCardSet(
  blogStatus,
  seoPageTitle,
  seoMetaDesc,
  seoURLSlug,
  seoTags,
  author,
  postBody,
  year,
  mfg,
  size,
  subsets,
  stars,
  formats,
  setName,
  headerImgName,
  footerImgName
) {
  // Insert postBody into TinyMCE
  tinymce.activeEditor.selection.setContent(postBody);

  // Populate the blogStatus dropdown
  const statusOptions = document.getElementById("blogStatus");

  if (blogStatus === "staged") {
    statusOptions.innerHTML = `
      <option id="staged" value="staged" selected>Staging</option>
      <option id="live" value="OK">Live</option>
    `;
  } else {
    statusOptions.innerHTML = `
      <option id="live" value="OK" selected>Live</option>
      <option id="staged" value="staged">Staging</option>
    `;
  }

  // Populate the rest of the fields
  document.getElementById("year").value = year;
  document.getElementById("seoPageTitle").value = seoPageTitle;
  document.getElementById("seoMetaDesc").value = seoMetaDesc;
  document.getElementById("seoURLSlug").value = seoURLSlug;
  document.getElementById("seoTags").value = seoTags;
  document.getElementById("author").value = author;
  document.getElementById("mfg").value = mfg;
  document.getElementById("size").value = size;
  document.getElementById("subsets").value = subsets;
  document.getElementById("stars").value = stars;
  document.getElementById("formats").value = formats;
  document.getElementById("setName").value = setName;
  document.getElementById("headerImgName").value = headerImgName;
  document.getElementById("footerImgName").value = footerImgName;
}


//********************************************* Preview Modal Functions *********************************************
// - Open / close the modal, and render the preview

function openPreview() {

  // Let's set up the some constants to hold the current values in the form
  const year = document.getElementById("year").value;
  const author = document.getElementById("author").value;
  const mfg = document.getElementById("mfg").value;
  const size = document.getElementById("size").value;
  const subsets = document.getElementById("subsets").value;
  const stars = document.getElementById("stars").value;
  const formats = document.getElementById("formats").value;
  const setName = document.getElementById("setName").value;
  const headerImg = document.getElementById("headerImgName").value;
  const footerImg = document.getElementById("footerImgName").value;
  // Get TinyMCE content
  const cardBody = tinymce.get("postBody").getContent();

  // Call the render function
  renderPreview(year,author,mfg,size,subsets,stars,formats,setName,headerImg,footerImg,cardBody);

  document.getElementById("previewModal").style.display = "block";

}


function renderPreview(year,author,mfg,size,subsets,stars,formats,setName,headerImg,footerImg,body) {

  // Convert stars to a number
  const numStars = parseInt(stars);

  // Generate star emojis
  let cleanStars = "";
  for (let i = 0; i < numStars; i++) {
    cleanStars += "&#127775; ";
  }

  // Reading time (same helper as live site)
  const readingStats = estimateReadingTime(body);

  // Write into previewContainer instead of cardSetDiv
  const container = document.getElementById("previewContainer");

  container.innerHTML += `
    <table class="set-details-table-style">
        <tr>
            <td style="width: 25%; font-size: 20px;">
                <strong>${setName}</strong>
            </td>
            <td rowspan="7" class="header-img-cell" style="width: 75%; text-align: center;">
                <img src="https://s3.us-east-2.amazonaws.com/mellowjohnny.cc.files/img/cards/${headerImg}"
                class="table-header-img"
                alt="Vintage hockey cards from the ${year} ${mfg} set">
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
            <strong><i>${readingStats.minutes} minute read</i></strong>
        </td>
      </tr>
      <tr>
        <td>${body}</td>
      </tr>
    </table>

    <table class="set-footer-table-style">
        <tr>
            <td style="text-align:left">
                <strong>and the winners are...</strong>
            </td>
        </tr>
        <tr>
            <td style="text-align:center">
                <img src="https://s3.us-east-2.amazonaws.com/mellowjohnny.cc.files/img/cards/${footerImg}"
                class="table-footer-img"
                alt="Vintage hockey cards from the ${year} ${mfg} set">
            </td>
        </tr>
    </table>

    <br>
    <hr/>
    <br><br>
  `;
}

function closePreview() {
  document.getElementById("previewModal").style.display = "none";
  document.getElementById("previewContainer").innerHTML = ""; // Clear the modal

}
