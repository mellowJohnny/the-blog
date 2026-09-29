

/** Generic CMS form UI helpers shared by every create/update page:
 * TinyMCE setup and submit-button state feedback. Split from the old
 * cms.js monolith - see cmsBlog.js/cmsCardSet.js for the CRUD logic. */

/**
 * -------------------------------------------- TinyMCE GLOBAL config!
 *
 * This function is called from every CMS page, allowing for a single place to contol the WYSIWYG editor.
 * cardImageBlocks (card set create/edit pages only) adds two toolbar
 * buttons for inserting the site's two recurring review images (a
 * small floated wrap image, a centered middle image) as structured,
 * non-editable blocks instead of hand-typed <img> HTML - see
 * registerCardImageBlockButtons() below.
 */

function initTinyEditor(selector = '#postBody', { cardImageBlocks = false } = {}) {
  // Card set pages swap the native image button/plugin for the two
  // custom ones above - no reason to offer both ways to insert an image.
  // (No 'noneditable' plugin needed - it 404s on this TinyMCE 8 build/
  // API key and isn't required anyway: a plain contenteditable="false"
  // attribute is honoured natively by the browser, and TinyMCE's core
  // getContent() already strips it - verified working without it.)
  const plugins = ['lists', 'link', 'code', 'autoresize'];
  if (!cardImageBlocks) plugins.push('image');

  const imageToolbarGroup = cardImageBlocks ? 'insertwrapimage insertmiddleimage' : 'image';
  const toolbar = `undo redo | styles | bold italic | alignleft aligncenter alignright alignjustify | outdent indent | bullist numlist | link ${imageToolbarGroup} lists code | wordcount`;

  tinymce.init({
    selector: selector,
    plugins: plugins,
    toolbar: toolbar,
    width: 1000,
    browser_spellcheck: true,
    min_height: 400, // The starting/minimum height
    max_height: 500, // The maximum limit before a scrollbar appears
    setup: cardImageBlocks ? registerCardImageBlockButtons : undefined
  });
}

/**
 * Loads a URL into a throwaway Image() to read its natural pixel size -
 * needed for the wrap image's inline width/height (the S3 picker only
 * returns a filename/URL, not dimensions).
 */
function loadImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Registers the two card-review image-insert buttons on a TinyMCE
 * instance. Each opens the existing S3 image browser (cmsImageBrowser.js,
 * callback mode) then a small dialog for the remaining choices, and
 * inserts the picked image as one atomic, non-editable block
 * (contenteditable="false" + mceNonEditable) - stripEditorOnlyMarkup()
 * removes both before saving.
 */
function registerCardImageBlockButtons(editor) {
  editor.ui.registry.addButton('insertwrapimage', {
    icon: 'image',
    tooltip: 'Insert wrap image',
    onAction: () => {
      openImageBrowser(null, (fileName, imageUrl) => {
        loadImageDimensions(imageUrl).then((dims) => openWrapImageDialog(editor, imageUrl, dims));
      });
    }
  });

  editor.ui.registry.addButton('insertmiddleimage', {
    icon: 'image',
    tooltip: 'Insert middle image',
    onAction: () => {
      openImageBrowser(null, (fileName, imageUrl) => openMiddleImageDialog(editor, imageUrl));
    }
  });
}

function openWrapImageDialog(editor, imageUrl, dims) {
  editor.windowManager.open({
    title: 'Insert Wrap Image',
    body: {
      type: 'panel',
      items: [
        { type: 'htmlpanel', html: `<img src="${imageUrl}" style="max-width:200px;max-height:120px;display:block;margin:0 auto 12px;">` },
        { type: 'selectbox', name: 'float', label: 'Float', items: [
          { value: 'left', text: 'Left' },
          { value: 'right', text: 'Right' }
        ] },
        { type: 'selectbox', name: 'scale', label: 'Mobile Scale', items: [
          { value: 'sm', text: 'Small (half size on mobile)' },
          { value: 'md', text: 'Medium (65% on mobile)' }
        ] },
        { type: 'input', name: 'alt', label: 'Alt Text' }
      ]
    },
    initialData: { float: 'left', scale: 'sm', alt: '' },
    buttons: [
      { type: 'cancel', text: 'Cancel' },
      { type: 'submit', text: 'Insert', primary: true }
    ],
    onSubmit: (api) => {
      const data = api.getData();
      const html = `<img class="img-wrap-${data.float} img-wrap-${data.scale} mceNonEditable" contenteditable="false" style="width: ${dims.width}px; height: ${dims.height}px;" src="${imageUrl}" alt="${escapeHtml(data.alt)}">`;
      editor.insertContent(html);
      api.close();
    }
  });
}

function openMiddleImageDialog(editor, imageUrl) {
  editor.windowManager.open({
    title: 'Insert Middle Image',
    body: {
      type: 'panel',
      items: [
        { type: 'htmlpanel', html: `<img src="${imageUrl}" style="max-width:200px;max-height:120px;display:block;margin:0 auto 12px;">` },
        { type: 'input', name: 'alt', label: 'Alt Text' }
      ]
    },
    initialData: { alt: '' },
    buttons: [
      { type: 'cancel', text: 'Cancel' },
      { type: 'submit', text: 'Insert', primary: true }
    ],
    onSubmit: (api) => {
      const data = api.getData();
      const html = `<img class="card-middle-img mceNonEditable" contenteditable="false" src="${imageUrl}" alt="${escapeHtml(data.alt)}">`;
      editor.insertContent(html);
      api.close();
    }
  });
}

// Strips the noneditable-block markers registerCardImageBlockButtons()
// adds (contenteditable="false", the mceNonEditable class) - these make
// a freshly-inserted image behave as one atomic unit while editing, but
// must never reach the stored postBody or the public site.
function stripEditorOnlyMarkup(html) {
  return html
    .replace(/\s+contenteditable="false"/g, "")
    .replace(/\s*\bmceNonEditable\b/g, "");
}

// Generic "Cancel" handler for setEdit.html/blogEdit.html - warns that
// unsaved changes will be lost (same red cmsConfirm() modal used for
// Delete), then navigates to the given picker page only if confirmed.
async function cmsCancelEdit(redirectTo) {
  const ok = await cmsConfirm("Any unsaved changes will be lost. Leave this page?");
  if (ok) {
    window.location.href = redirectTo;
  }
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
