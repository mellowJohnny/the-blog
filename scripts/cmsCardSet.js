

/** CMS create/update/delete functions for card set reviews. Split from
 * the old cms.js monolith - see cmsBlog.js (blog posts) and
 * cmsImageBrowser.js/cmsFormUI.js (shared image-picker/form helpers). */

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
   * Creates a new card set review - called from wlcms.html, hits the
   * createCardSet API.
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
 * Updates an existing card set review via the updateCardSet API.
 */

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
 * Deletes a card set review (confirmed first - irreversible). Cards'
 * key is setName+year, both required; setID also sent as a Lambda-side
 * safety check before deleting.
 */

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
 * Fetches every "staged" card set (name + ID only) so a CMS user can
 * pick one to update - calls the getCardSets API.
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

    // Sets created before blogCat existed have no value - fall back to
    // "reg" when a manufacturer is present, since the mfg dropdown only
    // offers real card companies, never "Tim Hortons"/"McDonald's".
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

  /** Renders one card set's name as a link to setEdit.html - called by
   * fetchAllCardSets(). */

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

  /** Renders one staged card set's name as a link to setEdit.html -
   * called by fetchAllStagedCardSets(). */

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
   * Fetches one card set by ID (getCardSetByID API), then hands it to
   * populateCardSet() to fill in setEdit.html's form.
   */

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

//**************************************** Star Rating widget (createCardSet.html/setEdit.html) **********************************

// Paints .selected on every star up to `value`, leaving the hidden
// #stars input (read by createCardSet()/updateCardSet()/renderPreview())
// as the single source of truth for the actual rating.
function paintStarRating(value, containerId = "starRatingWidget") {
  const container = document.getElementById(containerId);
  if (!container) return;
  const numeric = Number(value) || 0;
  container.querySelectorAll(".star-rating-icon").forEach(icon => {
    icon.classList.toggle("selected", Number(icon.dataset.value) <= numeric);
  });
}

// Wires click (locks in the rating) and hover (previews it, reverting
// to the locked-in value on mouse-out) for the star widget. Call once
// per page on load.
function initStarRatingWidget(containerId = "starRatingWidget", hiddenInputId = "stars") {
  const container = document.getElementById(containerId);
  const hiddenInput = document.getElementById(hiddenInputId);
  if (!container || !hiddenInput) return;

  container.querySelectorAll(".star-rating-icon").forEach(icon => {
    icon.addEventListener("click", () => {
      hiddenInput.value = icon.dataset.value;
      paintStarRating(hiddenInput.value, containerId);
    });
    icon.addEventListener("mouseenter", () => paintStarRating(icon.dataset.value, containerId));
  });

  container.addEventListener("mouseleave", () => paintStarRating(hiddenInput.value, containerId));

  // Paints whatever the hidden input already holds - "1" baked into
  // createCardSet.html's markup, or whatever populateCardSet() set by
  // the time this runs on setEdit.html.
  paintStarRating(hiddenInput.value, containerId);
}

//**************************************** populateCardSet Helper Function **********************************

  /**
   * Pre-populates setEdit.html's form fields for a given card set -
   * called by fetchCardSetByID().
   */
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
  // initStarRatingWidget() already painted once on page load, before
  // this async data arrived - repaint now against the real loaded value.
  paintStarRating(stars);
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
            <td><strong>Set Size:</strong> ${size}</td>
        </tr>
        <tr>
            <td><strong>Inserts:</strong> <i>${subsets}</i></td>
        </tr>
        <tr>
            <td><strong>Release Year:</strong> ${year}</td>
        </tr>
        <tr>
            <td><strong>Formats:</strong> ${formats}</td>
        </tr>
        <tr>
            <td><strong>Manufacturer:</strong> ${mfg}</td>
        </tr>
        <tr>
            <td><strong>Hella Rating:</strong> ${cleanStars}</td>
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
