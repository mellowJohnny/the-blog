

/** S3 image browser/uploader shared by createBlogPost.html,
 * createCardSet.html, and setEdit.html - one file for both the
 * card-set (img/cards/) and blog (img/blog/) image families. */

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
  let fileName = file.name;
  let contentType = file.type;
  let uploadBody = file;

  // A processor (wax pack pages) swaps the raw photo for its finished image; its error is already on screen.
  if (_imageBrowserProcessor) {
    await (_imageBrowserProcessing || processChosenImage(file));
    if (!_imageBrowserProcessed) return;
    ({ fileName, contentType } = _imageBrowserProcessed);
    uploadBody = _imageBrowserProcessed.blob;
  }

  // Determine which picker is active
  // Card picker sets: _imageBrowserTargetFieldId and/or _imageBrowserCallback
  // Blog picker sets: _blogImageTargetFieldId
  let directory = null;

  if (_imageBrowserTargetFieldId || _imageBrowserCallback) {
    directory = _imageBrowserDirectory;
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
      contentType: contentType
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
    headers: { "Content-Type": contentType },
    body: uploadBody
  });

  if (!uploadRes.ok) {
    status.textContent = "Upload failed.";
    return;
  }

  status.textContent = "Upload complete! Refreshing...";

  // Refresh the image list and auto-select the new image
  if (directory !== "img/blog/") {
    fetchImageList().then(files => {
      _imageBrowserFiles = files;
      renderImageList(files, _imageBrowserTargetFieldId);
      if (_imageBrowserCallback) {
        const callback = _imageBrowserCallback;
        _imageBrowserCallback = null;
        callback(fileName, data.finalUrl);
      } else {
        document.getElementById(_imageBrowserTargetFieldId).value = fileName;
      }
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
    .filter(file => file.startsWith(_imageBrowserDirectory) && file.length > _imageBrowserDirectory.length)



    // Existing search filter
    .filter(file => {
      if (!normalizedFilter) return true;
      return file.toLowerCase().includes(normalizedFilter);
    })

    .forEach(file => {
      const fileName = file.replace(_imageBrowserDirectory, ""); // Path is the browser's current folder
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
        if (_imageBrowserCallback) {
          const callback = _imageBrowserCallback;
          _imageBrowserCallback = null;
          callback(fileName, imageUrl);
        } else {
          document.getElementById(targetFieldId).value = fileName;
        }
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
let _imageBrowserCallback = null;
let _imageBrowserDirectory = "img/cards/";
let _imageBrowserProcessor = null;
let _imageBrowserProcessed = null;
let _imageBrowserProcessing = null;
let _imageBrowserProcessToken = 0;

// Card picker, generalized: pass onSelect(fileName, imageUrl) to insert
// the picked image somewhere other than a form field's value (e.g. a
// TinyMCE editor) instead of the default target-field behaviour.
// directory is the S3 folder to list and upload to (card sets by default).
// processor(file) is optional: it turns a chosen photo into the image to upload.
function openImageBrowser(targetFieldId, onSelect = null, directory = "img/cards/", processor = null) {
  const modal = document.getElementById("imageBrowserModal");
  const hadProcessor = _imageBrowserProcessor;
  _imageBrowserTargetFieldId = targetFieldId;
  _imageBrowserCallback = onSelect;
  _imageBrowserDirectory = directory;
  _imageBrowserProcessor = processor;
  if (processor || hadProcessor) resetImageBrowserUpload();

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

/** Clears the chosen file, its preview and any processing state (only used when a processor is involved). */
function resetImageBrowserUpload() {
  _imageBrowserProcessed = null;
  _imageBrowserProcessing = null;
  _imageBrowserProcessToken++;
  document.getElementById("uploadFileInput").value = "";
  document.getElementById("selectedFileName").textContent = "No file chosen";
  document.getElementById("uploadStatus").textContent = "";
  const preview = document.getElementById("uploadPreview");
  if (preview) preview.style.display = "none";
}

/** Runs the processor on a chosen file and shows the result (preview, size, any warning) or its error in the modal. */
function processChosenImage(file) {
  if (!_imageBrowserProcessor || !file) return Promise.resolve();
  const status = document.getElementById("uploadStatus");
  const preview = document.getElementById("uploadPreview");
  const token = ++_imageBrowserProcessToken;

  _imageBrowserProcessed = null;
  if (preview) preview.style.display = "none";
  status.textContent = "Processing...";

  _imageBrowserProcessing = _imageBrowserProcessor(file).then((result) => {
    if (token !== _imageBrowserProcessToken) return;
    _imageBrowserProcessed = result;
    if (preview) {
      preview.src = URL.createObjectURL(result.blob);
      preview.style.display = "";
    }
    status.textContent = `${result.fileName} - ${result.width} x ${result.height}, ${Math.round(result.blob.size / 1024)} KB${result.warning ? ` - ${result.warning}` : ""}`;
  }).catch((error) => {
    if (token === _imageBrowserProcessToken) status.textContent = error.message;
  });
  return _imageBrowserProcessing;
}

/**
 * Close the modal
 */
function closeImageBrowser() {
  const modal = document.getElementById("imageBrowserModal");
  modal.style.display = "none";
  _imageBrowserCallback = null;
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
      processChosenImage(file);
    });
  }
});
