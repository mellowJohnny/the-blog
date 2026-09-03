

/** This Script defines all the functions used by the CMS section of the site
 * to CREATE, UPDATE, and DELETE blog posts. Split out of the old cms.js
 * monolith - see scripts/cmsCardSet.js for the equivalent card-set-review
 * functions, and scripts/cmsImageBrowser.js / scripts/cmsFormUI.js for the
 * shared image-picker and form-UI helpers this depends on.
 */

/**
 * ---------------------------------------------- GLOBAL MAPPING
 * Used for organising blogs by type on the blog list page
 */

const BLOG_TYPE_LABELS = {
  1: "Tech Blogs",
  3: "Mach‑E",
  4: "SYNC Updates",
  5: "Raspberry Pi",
  99: "Home Page"
};

//*------------------------------------------ Create New Blog Post --------------------------------*

/**
 * This is the main AWS call used to CREATE a NEW BLOG POST
 * Called from the wlcms.html page
 * Calls the createBlogPost API exposed by AWS API Gateway
 *
 * @param {*} blogStatus
 * @param {*} title
 * @param {*} author
 * @param {*} postBody
 * @param {*} blogType
 * @param {*} imgName
 * @param {*} imgCap
 */

// NOTE: We don't pass in the postBody textarea content from the form anymore, we call the TinyMCE API to get it
 async function createBlogPost(published, title, imgName, imgCap, author, blogType) {

  // Basic client-side validation - Title and Post Body are marked required
  // in the HTML, but the Submit button is type="button" (not type="submit"),
  // so native HTML5 required validation never actually fires; enforce it here instead
  if (!title || !title.trim()) {
    await cmsAlert("Blog Post Title is required.");
    document.getElementById("title").focus();
    return;
  }

  const tinyBody = tinymce.activeEditor.getContent();
  const tinyBodyText = tinymce.activeEditor.getContent({ format: "text" }).trim();

  if (!tinyBodyText) {
    await cmsAlert("Post Body is required.");
    tinymce.activeEditor.focus();
    return;
  }

  cmsButtonSubmit();
  cmsCreateButtonReset();

  const payload = {
    published,
    title,
    imgName,
    imgCap,
    author,
    postBody: tinyBody,
    blogType
  };

  getAuthToken().then(token => fetch("https://s4ge5t9w06.execute-api.us-east-2.amazonaws.com/dev", { // createBlogPost API
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

      // If Lambda returned an error status, show the error and stay on the page
      if (!response.ok) {
        // Lambda error format: { error: "...", details: "..." }
        const errMsg = data.error || data.message || "An unknown error occurred.";
        await cmsAlert(errMsg);
        return;
      }

      // SUCCESS: Lambda decides the message
      // Lambda always returns: { message: "..." }
      await cmsAlert(data.message || "Success, but no message returned from server.");
      window.location.href = "/cms/pickBlog.html";
    })
    .catch(error => console.log("error", error));
}


//* ---------------------------------------------------- Update Blog Post ----------------------------------------- *

/**
 * This function is used to UPDATE an existing Blog Post
 * Calls the updateBlogPost API which updates the matching record in DynamoDB
 * NOTE: We don't pass in the postBody anymore as we fetch it via API call to TinyMCE
 *
 * @param {*} title
 * @param {*} imgName
 * @param {*} imgCap
 * @param {*} blogStatus
 * @param {*} blogType
 * @param {*} time
 * @param {*} blogID
 **/

 function updateBlogPost(title, imgName, imgCap, published, blogType, time, blogID) {
  // Update button state
  cmsButtonSubmit();
  cmsUpdateButtonReset();

  // Get TinyMCE content
  const tinyBody = tinymce.get("postBody").getContent();

  // Normalize types
  const normalizedPublished = (published === "true" || published === true);
  const normalizedBlogType = Number(blogType);

  // Build request body to match backend / DynamoDB
  const payload = {
    blogID: blogID,
    title: title,
    img: imgName,       // use "img" to match table and getBlogByID
    imgCap: imgCap,
    published: normalizedPublished,
    blogType: normalizedBlogType,
    time: time,
    postBody: tinyBody
  };

  // console.log("UPDATE PAYLOAD:", payload);

  getAuthToken().then(token => {
    const requestOptions = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify(payload),
      redirect: "follow"
    };

    return fetch("https://836pk40tsl.execute-api.us-east-2.amazonaws.com/dev", requestOptions);
  })
    .then(async response => {
      let data;
      try {
        data = await response.json();
      } catch {
        await cmsAlert("Unexpected server response.");
        return;
      }

      // If Lambda returned an error status, show the error and stay on the page
      if (!response.ok) {
        await cmsAlert(data.message || data.error || "Error updating blog.");
        return;
      }

      // SUCCESS: Expecting something like: { message: "Blog updated successfully" }
      await cmsAlert(data.message || "Blog updated.");
      window.location.href = "/cms/pickBlog.html";
    })
    .catch(async error => {
      console.log("Error updating blog:", error);
      await cmsAlert("Error updating blog.");
    });
}


//* ---------------------------------------------------------------- Delete Blog Post ----------------------------------------------------- *

/**
 * This function is used to DELETE an existing Blog Post
 * Calls the deleteBlogPost API which removes the matching record from DynamoDB
 * Confirms with the user first since this is destructive and irreversible
 * Blogs table key is blogType + time, so both are required (blogID is
 * also sent along as a safety check the Lambda verifies before deleting)
 *
 * @param {*} blogID
 * @param {*} blogType
 * @param {*} time
 **/

async function deleteBlogPost(blogID, blogType, time) {
  const ok = await cmsConfirm("Delete this blog post? This cannot be undone.");
  if (!ok) return;

  const payload = {
    blogID: blogID,
    blogType: Number(blogType),
    time: time
  };

  getAuthToken().then(token => fetch("https://j9dhm7nwhk.execute-api.us-east-2.amazonaws.com/dev", { // deleteBlogHandler API
    method: "DELETE",
    headers: { "Content-Type": "application/json", "Authorization": token },
    body: JSON.stringify(payload)
  }))
    .then(response => response.json())
    .then(async result => {
      await cmsAlert(result.message || "Blog post deleted.");
      window.location.href = "/cms/pickBlog.html";
    })
    .catch(async error => {
      console.log("Error deleting blog:", error);
      await cmsAlert("Error deleting blog.");
    });
}


/*********************************************************************************************
 ****************************************** Helper Functions *********************************
 *********************************************************************************************/



// ******************** Get Blogs For Update API Call **********************************

/**
 * This Function is used to fetch all LIVE records from the Blog table in DynamoDB
 * It is used by the CMS users to allow Users to select a single blog to be updated
 * Calls the getBlogsForUpdate API exposed by AWS API Gateway, which uses the listBlogsForUpdate() Lambda
 * Called on page load from pickBlog.html
 * FOR EVERY BLOG RETURNED it calls the displayBlogs() helper to actually write to the <div>
 * Uses the global blogType to name mapping constants
 */

function getBlogsForUpdate() {
  const urlToFetch = `https://pqf303gfq6.execute-api.us-east-2.amazonaws.com/dev`; // getBlogsForUpdate API

  getAuthToken().then(token => fetch(urlToFetch, { headers: { "Authorization": token } }))
    .then(response => response.json())
    .then(data => {

      const blogArray = data.blogs || data.items || [];

      if (blogArray.length === 0) {
        document.getElementById("noBlogsDiv").innerHTML = `...no blogs are currently live`;
        return;
      }

      // Clear the container before adding new content
      const container = document.getElementById("listBlogsDiv");
      container.innerHTML = "";

      let lastType = null;

      for (let i = 0; i < blogArray.length; i++) {
        const { title, blogID, blogType } = blogArray[i];

        // Convert numeric blogType → friendly label
        const typeLabel = BLOG_TYPE_LABELS[blogType] || "Other";

        // Insert divider when the type changes
        if (blogType !== lastType) {
          const header = document.createElement("h2");
          header.textContent = typeLabel;
          header.className = "blog-type-divider";
          container.appendChild(header);

          lastType = blogType;
        }

        // Render the blog entry using your existing function
        displayBlogs(title, blogID, blogType);
      }
    })
    .catch(err => {
      document.getElementById("noBlogsDiv").innerHTML = `...Ah, Houston, we've had a problem...`;
      console.log("Something went wrong...: " + err);
    });
}


//*********************************** Get STAGED Blogs For Update API Call **********************************

/**
 * This Function is used to fetch all STAGED records from the Blog table in DynamoDB
 * The API limits the data returned to only the name of the blog and its blogID
 * It is used by the CMS users to allow Users to select a single blog to be updated
 * Calls the getStagedBlogsForUpdate API exposed by AWS API Gateway
 * Called on page load from pickBlog.html
 * FOR EVERY BLOG RETURNED it calls the displayStagedBlogs() helper to actually write to the <div>
 * Uses the global blogType to name mapping constants
 */

  function getStagedBlogsForUpdate() {

  const urlToFetch = `https://sh8girwnxg.execute-api.us-east-2.amazonaws.com/dev`;

  getAuthToken().then(token => fetch(urlToFetch, { headers: { "Authorization": token } }))
    .then(response => response.json())
    .then(data => {

      const blogArray = data.items || [];

      if (blogArray.length === 0) {
        document.getElementById("noStagedBlogsDiv").innerHTML = `...no staged blogs found`;
        return;
      }

      const container = document.getElementById("listStagedBlogsDiv");
      container.innerHTML = "";

      let lastType = null;

      for (let i = 0; i < blogArray.length; i++) {
        const { title, blogID, blogType } = blogArray[i];

        // Convert numeric blogType → friendly label
        const typeLabel = BLOG_TYPE_LABELS[blogType] || "Other";

        // Insert divider when the type changes
        if (blogType !== lastType) {
          const header = document.createElement("h2");
          header.textContent = typeLabel;
          header.className = "blog-type-divider";
          container.appendChild(header);

          lastType = blogType;
        }

        // Render the blog entry using your existing function
        displayStagedBlogs(title, blogID, blogType);
      }
    })
    .catch(err => {
      document.getElementById("noStagedBlogsDiv").innerHTML = `...Ah, Houston, we've had a problem...`;
      console.log("Something went wrong...: " + err);
    });
}


//****************************** displayBlogs Helper Function ***************************

/**
* Helper function Called by fetchAllCardSets() to apply HTML formatting a Blog record
* Used by CMS to present Blog titles to allow for an individual blog to be updated, passing the blogID to blogEdit.html
*
* @param {*} title
* @param {*} blogID
*
*/

function displayBlogs(title, blogID, blogType) {

  // Title is already a clean string now — no need to parse
  const cleanTitle = title;

  let blogBody = document.getElementById("listBlogsDiv");
  blogBody.innerHTML +=
    `<table class="set-details-table-style">
       <tr>
         <td style="width:400px;font-size:20px">
            <a href="blogEdit.html?blogID=${blogID}&blogType=${blogType}">
              <strong>${cleanTitle}</strong>
            </a>
         </td>
       </tr>
     </table>`;
}


//******************************* displayStagedBlogs Helper Function ************************************

/**
* Helper function Called by getStagedBlogsForUpdate() to apply HTML formatting a Blog record
* Used by CMS to present Blog titles to allow for an individual blog to be updated, passing the blogID to blogEdit.html
*
* @param {*} title
* @param {*} blogID
*
*/

function displayStagedBlogs(title, blogID, blogType) {

    // Title is already a plain string now
    const cleanTitle = title;

    let blogBody = document.getElementById("listStagedBlogsDiv");

    blogBody.innerHTML +=
        `<table class="set-details-table-style">
            <tr>
                <td style="width:400px;font-size:20px">
                    <a href="blogEdit.html?blogID=${blogID}&blogType=${blogType}">
                        <strong>${cleanTitle}</strong>
                    </a>
                </td>
            </tr>
        </table>`;
}


//******************************* Fetch Blog by ID - Populates the CMS Form For Update **************************

/**
 * This function fetches a single blog, given it's ID and parses out the individual fields
 * It the calls populateBlog() which in turn populates the HTML form on blogEdit.html
 * Calls the getBlogByID API exposed by AWS API Gateway
 *
 * @param {*} id
 *
 **/
function fetchBlogByID(id,type) {

  if (!id) {
    document.getElementById("errorDiv").innerHTML = "No blog ID provided.";
    return;
  }

  const urlToFetch = `https://gcd40hir88.execute-api.us-east-2.amazonaws.com/dev?blogID=${id}&blogType=${type}`;

  getAuthToken().then(token => fetch(urlToFetch, { headers: { "Authorization": token } }))
    .then(response => response.json())
    .then(data => {

     // console.log("CHRISTIAN'S RAW BLOG-BY-ID RESPONSE:", data);

      // New Lambda returns: { item: { ...fields... } }
      const blog = data.item;

      if (!blog) {
        document.getElementById("errorDiv").innerHTML = "Blog not found.";
        return;
      }

      // Pass the entire blog object to populateBlog()
      populateBlog(blog);
    })
    .catch(err => {
      console.log("Error fetching blog:", err);
      document.getElementById("errorDiv").innerHTML = "Error loading blog.";
    });
}

//********************************** populateBlog Helper Function *********************************

  /**
  * Helper function Called by fetchBlogByID()
  * Used by CMS to pre-populate each form field for a given Card Set
  *
  * @param {*} postBody
  * @param {*} published
  * @param {*} blogType
  * @param {*} time
  * @param {*} title
  */

  /** This function calls the associated DIV on the Set Update form and populates it with the current value
   * The Lambda now returns a marshalled Javascript Object, not a JSON object, so we can immediately access
   * the properties using dot notation. No more looping over the array, looking for "body", and the accessing the JSON
  */
  function populateBlog(blog) {

  // Populate TinyMCE
  tinymce.get("postBody").setContent(blog.postBody);

  // Published dropdown
  const statusOptions = document.getElementById("published");
  statusOptions.innerHTML = `
    <option value="true" ${blog.published ? "selected" : ""}>Live</option>
    <option value="false" ${!blog.published ? "selected" : ""}>Staging</option>
  `;

  // Populate form fields
  document.getElementById("title").value = blog.title;
  document.getElementById("imgName").value = blog.img;
  document.getElementById("imgCap").value = blog.imgCap;
  document.getElementById("blogType").value = blog.blogType;
  document.getElementById("time").value = blog.time;
}
