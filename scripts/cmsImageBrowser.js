

/** This Script defines the S3 image browser/uploader shared by the two
 * "create" CMS pages (createBlogPost.html, createCardSet.html). It's
 * genuinely two parallel families - one for card-set images
 * (img/cards/), one for blog images (img/blog/) - kept in one file
 * rather than split further since uploadNewImage() and
 * closeImageBrowser() are shared by both and would otherwise create a
 * cross-file dependency. Split out of the old cms.js monolith.
 */

/* ------------------------------------------------ IMAGE PICKER -------------------------------------*/

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
   // .filter(file => file.startsWith("img/cards/"))

    // Filter out the root directory...
    .filter(file => file.startsWith("img/cards/") && file.length > "img/cards/".length)



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

//********************************* */ BLOG-SPECIFIC IMAGE PICKER FUNCTIONS *******************************/

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
  return fetch("https://y3d5n8hq61.execute-api.us-east-2.amazonaws.com/dev")
    .then(res => res.json())
    .then(data => {
      return (data.files || [])
        .filter(f => f.startsWith("img/blog/"))
        .filter(f => !f.endsWith("/"));   // ⭐ exclude the root directory
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
