

/** This Script defines all the functions used by the CMS section of the site 
 * to both CREATE and UPDATE existing blog posts and card set reviews
 * There is no ability to delete a blog. Why would you want to? ;-)
 */

/**
 * TinyMCE GLOBAL config!
 * This function is called from every CMS page, allowing for a single place to contol the WYSIWYG editor
 */

function initTinyEditor(selector = '#postBody') 
{ tinymce.init({ 
  selector: selector, 
  plugins: ['lists', 'link', 'image', 'code'], // only actual plugins 
  toolbar: 'undo redo | styles | bold italic | alignleft aligncenter alignright alignjustify | outdent indent | advlist autolink link image lists charmap preview code | wordcount', 
  width: 1000 
  }); 
}

// GLOBAL MAPPING used for organising blogs by type on the blog list page
const BLOG_TYPE_LABELS = {
  1: "Tech Blogs",
  3: "Mach‑E",
  4: "SYNC Updates",
  5: "Raspberry Pi",
  99: "Home Page"
};

/*************** IMAGE PICKER ********************/

/**
 *  Image Upload Function
 */
async function uploadNewImage() {
  const fileInput = document.getElementById("uploadFileInput");
  const status = document.getElementById("uploadStatus");

  if (!fileInput.files.length) {
    status.textContent = "Please choose a file first.";
    return;
  }

  const file = fileInput.files[0];
  const fileName = file.name;

  // Determine which picker is active
  // Card picker sets: _imageBrowserTargetFieldId
  // Blog picker sets: _blogImageTargetFieldId
  let directory = null;

  if (_imageBrowserTargetFieldId) {
    directory = "img/cards/";
  } else if (_blogImageTargetFieldId) {
    directory = "img/blog/";
  } else {
    status.textContent = "Error: No active image picker.";
    return;
  }

  status.textContent = "Requesting upload URL...";

  // Call your Lambda
  const response = await fetch("https://k95rdenpn5.execute-api.us-east-2.amazonaws.com/dev", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: fileName,
      directory: directory,
      contentType: file.type
    })
  });

  const data = await response.json();

  if (!data.uploadUrl) {
    status.textContent = "Failed to get upload URL.";
    return;
  }

  status.textContent = "Uploading to S3...";

  // Upload directly to S3
  const uploadRes = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file
  });

  if (!uploadRes.ok) {
    status.textContent = "Upload failed.";
    return;
  }

  status.textContent = "Upload complete! Refreshing...";

  // Refresh the image list and auto-select the new image
  if (directory === "img/cards/") {
    fetchImageList().then(files => {
      _imageBrowserFiles = files;
      renderImageList(files, _imageBrowserTargetFieldId);
      document.getElementById(_imageBrowserTargetFieldId).value = fileName;
      closeImageBrowser();
    });
  } else {
    fetchBlogImageList().then(files => {
      _blogImageFiles = files;
      renderBlogImageList(files, _blogImageTargetFieldId);
      document.getElementById(_blogImageTargetFieldId).value = data.finalUrl;
      closeImageBrowser();
    });
  }
}



/**
 * Image Picker Functionakity 
 * Fetchs a list of images from S3 via the cmsImagePicker Lambda
 */
function fetchImageList() {
  return fetch("https://y3d5n8hq61.execute-api.us-east-2.amazonaws.com/dev") // cmsImagePicker API
    .then(res => res.json())
    .then(data => data.files || []);
}

/**
 * Helper to render the image list (with optional filter)
 * ONLY WORKS WITH CARD SETS !!
 */
function renderImageList(files, targetFieldId, filterText = "") {
  const container = document.getElementById("imageList");
  container.innerHTML = "";

  const normalizedFilter = filterText.toLowerCase();

  files
    // ⭐ NEW: The Lambda returns ALL images, so filter only show card images
    .filter(file => file.startsWith("img/cards/"))

    // Existing search filter
    .filter(file => {
      if (!normalizedFilter) return true;
      return file.toLowerCase().includes(normalizedFilter);
    })

    .forEach(file => {
      const fileName = file.replace("img/cards/", ""); // Path is specific to card sets
      const imageUrl = "https://s3.us-east-2.amazonaws.com/mellowjohnny.cc.files/" + file;

      // Wrapper for thumbnail + label
      const wrapper = document.createElement("button");
      wrapper.type = "button";
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.alignItems = "center";
      wrapper.style.padding = "8px";
      wrapper.style.borderRadius = "6px";
      wrapper.style.border = "1px solid #ccc";
      wrapper.style.backgroundColor = "#eee";
      wrapper.style.cursor = "pointer";

      // Thumbnail
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = fileName;
      img.style.maxWidth = "150px";
      img.style.maxHeight = "80px";
      img.style.objectFit = "contain";
      img.style.marginBottom = "6px";

      // Label
      const label = document.createElement("span");
      label.textContent = fileName;
      label.style.fontSize = "12px";

      wrapper.appendChild(img);
      wrapper.appendChild(label);

      wrapper.onclick = () => {
        document.getElementById(targetFieldId).value = fileName;
        closeImageBrowser();
      };

      container.appendChild(wrapper);
    });
}


/**
 * Open the S3 Image Browser modal
 */
let _imageBrowserFiles = [];
let _imageBrowserTargetFieldId = null;

function openImageBrowser(targetFieldId) {
  const modal = document.getElementById("imageBrowserModal");
  _imageBrowserTargetFieldId = targetFieldId;

  fetchImageList().then(files => {
    _imageBrowserFiles = files;
    const searchInput = document.getElementById("imageSearch");
    if (searchInput) {
      searchInput.value = "";
    }
    renderImageList(_imageBrowserFiles, _imageBrowserTargetFieldId);
    modal.style.display = "block";
  });
}

/**
 * Close the modal
 */
function closeImageBrowser() {
  const modal = document.getElementById("imageBrowserModal");
  modal.style.display = "none";
}

/**
 * Filter image list based on search box input
 */
function filterImageList() {
  const searchInput = document.getElementById("imageSearch");
  if (!searchInput) return;
  const filterText = searchInput.value || "";
  renderImageList(_imageBrowserFiles, _imageBrowserTargetFieldId, filterText);
}

//************** BLOG-SPECIFIC IMAGE PICKER FUNCTIONS **************** */
let _blogImageFiles = [];
let _blogImageTargetFieldId = null;

function openBlogImageBrowser(targetFieldId) {
  const modal = document.getElementById("imageBrowserModal");
  _blogImageTargetFieldId = targetFieldId;

  fetchBlogImageList().then(files => {
    _blogImageFiles = files;

    const searchInput = document.getElementById("imageSearch");
    if (searchInput) searchInput.value = "";

    renderBlogImageList(_blogImageFiles, _blogImageTargetFieldId);
    modal.style.display = "block";
  });
}

function fetchBlogImageList() {
  return fetch("https://y3d5n8hq61.execute-api.us-east-2.amazonaws.com/dev") // same Lambda
    .then(res => res.json())
    .then(data => {
      // Filter only blog images
      return (data.files || []).filter(f => f.startsWith("img/blog/"));
    });
}


function renderBlogImageList(files, targetFieldId, filterText = "") {
  const container = document.getElementById("imageList");
  container.innerHTML = "";

  const normalizedFilter = filterText.toLowerCase();

  files
    .filter(file => file.toLowerCase().includes(normalizedFilter))
    .forEach(file => {
      const fileName = file.replace("img/blog/", "");
      const imageUrl = "https://s3.us-east-2.amazonaws.com/mellowjohnny.cc.files/" + file;

      const wrapper = document.createElement("button");
      wrapper.type = "button";
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.alignItems = "center";
      wrapper.style.padding = "8px";
      wrapper.style.borderRadius = "6px";
      wrapper.style.border = "1px solid #ccc";
      wrapper.style.backgroundColor = "#eee";
      wrapper.style.cursor = "pointer";

      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = fileName;
      img.style.maxWidth = "150px";
      img.style.maxHeight = "80px";
      img.style.objectFit = "contain";
      img.style.marginBottom = "6px";

      const label = document.createElement("span");
      label.textContent = fileName;
      label.style.fontSize = "14px";

      wrapper.appendChild(img);
      wrapper.appendChild(label);

      wrapper.onclick = () => {
        // Blog posts expect the FULL URL in imgName
        document.getElementById(targetFieldId).value = imageUrl;
        closeImageBrowser();
      };

      container.appendChild(wrapper);
    });
}

function filterBlogImageList() {
  const searchInput = document.getElementById("imageSearch");
  if (!searchInput) return;
  const filterText = searchInput.value || "";
  renderBlogImageList(_blogImageFiles, _blogImageTargetFieldId, filterText);
}
/** Let's make sure the image name is always beside the "Pick a File" button*/
document.addEventListener("DOMContentLoaded", function () {
  const input = document.getElementById("uploadFileInput");
  if (input) {
    input.addEventListener("change", function () {
      const file = this.files[0];
      document.getElementById("selectedFileName").textContent = file ? file.name : "No file chosen";
    });
  }
});


//**************************************** Create New Blog Post ***************************************************

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
 function createBlogPost(published, title, imgName, imgCap, author, blogType) {

  cmsButtonSubmit();
  cmsCreateButtonReset();

  const tinyBody = tinymce.activeEditor.getContent();

  let myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  let raw = JSON.stringify({
    published,
    title,
    imgName,
    imgCap,
    author,
    postBody: tinyBody,
    blogType
  });

  console.log(`In createBlogPost(): ${raw}`);

  let requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  fetch("https://s4ge5t9w06.execute-api.us-east-2.amazonaws.com/dev", requestOptions) // createBlogPost API
    .then(response => response.json())
    .then(result => alert(result.message))
    .catch(error => console.log('error', error));
}

  
  
//***************************************** Create New Card Set ******************************************
  
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
  function createCardSet(blogStatus, setName, size, subsets, stars, formats, year, headerImgName, footerImgName, mfg) {

  // Let's change the state of the button, now that we've clicked it...
  cmsButtonSubmit();

  // Now start a timer and change the button state to reflect the submit event, waiting X milliseconds
  // Because the timer is longer, usually, then the amount of time it takes to call the API (which then waits for the result)
  // this makes it look like the button is waiting for the modal to close first :-)
  cmsCreateButtonReset();
  
  // Call the Tiny API to fetch the content from the editor...
  const tinyBody = tinymce.activeEditor.getContent();

  // instantiate a headers object
  let myHeaders = new Headers();

  // add content type header to object
  myHeaders.append("Content-Type", "application/json");

  // using built in JSON utility package turn object to string and store in a variable
  let raw = JSON.stringify({
    "blogStatus": blogStatus,
    "setName": setName,
    "size": size,
    "subsets": subsets,
    "stars": stars,
    "formats": formats,
    "year": year,
    "postBody": tinyBody,
    "mfg": mfg,
    "headerImgName": headerImgName,
    "footerImgName": footerImgName
  });

  // create a JSON object with parameters for API call and store in a variable
  let requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  // make API call to cardPost endpoint with parameters and use promises to get response
  fetch("https://05uss9ffij.execute-api.us-east-2.amazonaws.com/dev", requestOptions)
    .then(async response => {
      // Parse JSON safely
      let data;
      try {
        data = await response.json();
      } catch {
        alert("Unexpected server response.");
        return;
      }

      // If Lambda returned an error status, show the error
      if (!response.ok) {
        // Lambda error format: { error: "...", details: "..." }
        const errMsg = data.error || data.message || "An unknown error occurred.";
        alert(errMsg);
        return;
      }

      // SUCCESS: Lambda decides the message
      // Lambda always returns: { message: "..." }
      if (data.message) {
        alert(data.message);
      } else {
        alert("Success, but no message returned from server.");
      }
    })
    .catch(error => {
      console.log('Create error:', error);
      alert("Network error creating the card set.");
    });
}
 


//******************************************* Update Card Set ***************************************

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

function updateCardSet(
  blogStatus,
  setName,
  size,
  subsets,
  stars,
  formats,
  year,
  headerImgName,
  footerImgName,
  mfg
) {
  cmsButtonSubmit();
  cmsUpdateButtonReset();

  const tinyBody = tinymce.activeEditor.getContent();

  const payload = {
    blogStatus,
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

  fetch("https://bb8yehibjb.execute-api.us-east-2.amazonaws.com/dev", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => {
     // console.log("UPDATE RESPONSE:", data);

      let message = "Update complete.";

      // Normalize all possible shapes
      if (typeof data === "string") {
        message = data;
      } else if (data.message) {
        message = data.message;
      } else if (data.body) {
        try {
          const parsed = JSON.parse(data.body);
          message = parsed.message || data.body;
        } catch {
          message = data.body;
        }
      }

      alert(message);
    })
    .catch(error => {
      console.log("Update error:", error);
      alert("Something went wrong updating the card set.");
    });
}


//********************************** Update Blog Post *******************************************

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

  const requestOptions = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    redirect: "follow"
  };

  fetch("https://836pk40tsl.execute-api.us-east-2.amazonaws.com/dev", requestOptions)
    .then(response => response.json())
    .then(result => {
      // Expecting something like: { message: "Blog updated successfully" }
      alert(result.message || "Blog updated.");
    })
    .catch(error => {
      console.log("Error updating blog:", error);
      alert("Error updating blog.");
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

  fetch(urlToFetch)
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

  fetch(urlToFetch)
    .then(response => response.json())
    .then(data => {

    //  console.log("CHRISTIAN's RAW STAGED BLOG RESPONSE:", data);

      const blogArray = data.items || [];

      if (blogArray.length === 0) {
        document.getElementById("noBlogsDiv").innerHTML = `...no staged blogs found`;
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
          const header = document.createElement("h3");
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
      document.getElementById("noBlogsDiv").innerHTML = `...Ah, Houston, we've had a problem...`;
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

  fetch(urlToFetch)
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


  

//********************************* Fetch All Card Sets For Update **********************************
/*
  NOTE ABOUT RESPONSE SHAPE:
  --------------------------
  Both the "live" and "staged" Lambdas return a raw array from AWS Lambda,
  but API Gateway does NOT always forward the response in a consistent shape.

  Depending on API Gateway behavior, the browser may receive:
    1. A raw array (ideal case)
         [ { setID, setName }, ... ]

    2. A proxy response with body as a JSON string
         { statusCode: 200, body: "[...]" }

    3. A proxy response with body already parsed
         { statusCode: 200, body: [ ... ] }

    4. A DynamoDB-style response (if the Lambda ever returns data.Items)
         { Items: [ ... ] }

  Because of these variations, we normalize the response by checking:
    - If the response *is already an array*
    - If body is a JSON string
    - If body is an array
    - If Items[] exists

  This ensures the UI works even if API Gateway or Lambda returns
  slightly different shapes.
*/

/**
 * This Function is used to fetch all records from the Card table in DynamoDB with status="OK"
 * The API limits the data returned to only the name of the card set and it's ID  
 * It is used by the CMS users to allow Users to select a single set to be updated
 * Calls the getCardSets API exposed by AWS API Gateway
 */

 async function fetchAllCardSets() {
  const urlToFetch = `https://tx7romovbd.execute-api.us-east-2.amazonaws.com/dev`;

  try {
    const response = await fetch(urlToFetch);
    const data = await response.json();

   // console.log("RAW DATA FROM LAMBDA:", data);

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

    cardSets.forEach(set => {
      displayCardSets(set.setID, set.setName);
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
    const response = await fetch(urlToFetch);
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
        `...no card sets are currently staged`;
      return;
    }

    stagedSets.forEach(set => {
      displayStagedCardSets(set.setID, set.setName);
    });

  } catch (err) {
    console.log("Something went wrong:", err);
    document.getElementById("editBlogsDiv").innerHTML =
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
  
  function displayCardSets(setID, setName) {
  const blogBody = document.getElementById("editBlogsDiv");

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

  fetch(urlToFetch)
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
  document.getElementById("mfg").value = mfg;
  document.getElementById("size").value = size;
  document.getElementById("subsets").value = subsets;
  document.getElementById("stars").value = stars;
  document.getElementById("formats").value = formats;
  document.getElementById("setName").value = setName;
  document.getElementById("headerImgName").value = headerImgName;
  document.getElementById("footerImgName").value = footerImgName;
}


//************* Helper functions to change CMS Submit state *************

    // Change the submit button colour & text on Submit
    function cmsButtonSubmit() {
        document.getElementById('cmsSubmitButton').style.backgroundColor = "#36a5e6";
        document.getElementById('cmsSubmitButton').innerHTML = "Crossing Fingers...";
    }

    // Post-Submit - change the CREATE submit button colour & text back to initial state 
    function cmsCreateButtonReset() {
        setTimeout(changeMeBack, 1500);
    }

    function changeMeBack(){
        document.getElementById('cmsSubmitButton').style.backgroundColor = "#256386";
        document.getElementById('cmsSubmitButton').innerHTML = "Submit Post";
    }

    // Post-Submit - change the UPDATE submit button colour & text back to initial state, 
    function cmsUpdateButtonReset() {
        setTimeout(changeMeBackUpdate, 1500);
    }

    function changeMeBackUpdate(){
        document.getElementById('cmsSubmitButton').style.backgroundColor = "#256386";
        document.getElementById('cmsSubmitButton').innerHTML = "Update Post";
    }

//************ Helper Function To Generate Copyright Date for any <div id="copy"> tag 
//Current used in all <footer> page sections
function fetchCopyrightYear() {
    const copyYear = new Date().getFullYear();
    let copyFooter = document.getElementById("copy");
    copyFooter.innerHTML = `<p>&copy; ${copyYear} Christian Couillard </p>`;
    
}

/**
 * Cache Flushing function
 * This function is called by the CMS to flush the cache of the API Gateway
 * It is used by the CMS users to allow Users to select a single set to be updated
 * Calls the flushCache API exposed by AWS API Gateway
 * setEdit.html will pass in 'year'
 * blogEdit.html will pass in 'blogType'
 */

async function flushCache({ year = null, blogType = null }) {
  const endpoint = "https://pj7y1xqi96.execute-api.us-east-2.amazonaws.com/dev/flushCache";

  const payload = {};

  // BLOGS: only blogType is needed
  if (blogType) {
    payload.blogType = blogType;
  }

  // CARDSETS: year determines pageName automatically
  if (year) {
    const numericYear = Number(year);

    // Determine pageName based on year
    const pageName = numericYear > 1986 ? "junkWax" : "classicWax";

    payload.year = year;
    payload.pageName = pageName;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Cache flush failed");
    }

    return data;

  } catch (err) {
    console.error("Cache flush error:", err);
    throw err;
  }
}











      
