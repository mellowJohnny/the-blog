

/** CMS create/update/delete functions for blog posts. Split from the
 * old cms.js monolith - see cmsCardSet.js (card sets) and
 * cmsImageBrowser.js/cmsFormUI.js (shared image-picker/form helpers). */

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
 * Creates a new blog post - called from wlcms.html, hits the
 * createBlogPost API.
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
 * Updates an existing blog post via the updateBlogPost API. postBody
 * comes from TinyMCE directly, not a passed-in param.
 */

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
 * Deletes a blog post (confirmed first - irreversible). Blogs' key is
 * blogType+time, both required; blogID also sent as a Lambda-side
 * safety check before deleting.
 */

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
 * Fetches all live blogs (getBlogsForUpdate API, pickBlog.html on
 * load) so a CMS user can pick one to update - calls displayBlogs()
 * per row, grouped by BLOG_TYPE_LABELS.
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
 * Fetches all staged blogs (name + ID only) so a CMS user can pick
 * one to update - calls displayStagedBlogs() per row, grouped by
 * BLOG_TYPE_LABELS.
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

/** Renders one blog's title as a link to blogEdit.html - called by
 * getBlogsForUpdate(). */

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

/** Renders one staged blog's title as a link to blogEdit.html -
 * called by getStagedBlogsForUpdate(). */

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
 * Fetches one blog by ID (getBlogByID API), then hands it to
 * populateBlog() to fill in blogEdit.html's form.
 */
function fetchBlogByID(id) {

  if (!id) {
    document.getElementById("errorDiv").innerHTML = "No blog ID provided.";
    return;
  }

  const urlToFetch = `https://gcd40hir88.execute-api.us-east-2.amazonaws.com/dev?blogID=${id}`;

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
 * Pre-populates blogEdit.html's form fields for a given blog - called
 * by fetchBlogByID(). Lambda returns a plain object, so fields are
 * read via dot notation directly, no JSON parsing needed.
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
