

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

// Resolves with the editor once tinymce.init() finishes. Edit pages fetch
// their record in parallel, so populate code awaits this rather than
// assuming the editor already exists.
let resolveTinyEditorReady;
const tinyEditorReady = new Promise((resolve) => { resolveTinyEditorReady = resolve; });

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
    // Right-click opens the browser's own menu (spelling suggestions)
    // instead of TinyMCE's link/image menu - those stay on the toolbar.
    contextmenu: false,
    min_height: 400, // The starting/minimum height
    max_height: 500, // The maximum limit before a scrollbar appears
    setup: cardImageBlocks ? registerCardImageBlockButtons : undefined
  }).then((editors) => resolveTinyEditorReady(editors[0]));
}


// Inline editor for the Preview modal's review text (cmsCardSet.js).
// Text-only on purpose: the image picker and HTML-source dialog stay in the
// main editor. The toolbar docks in the modal and menus open inside it, or
// they would land behind the modal (z-index 9999).
function initPreviewEditor(target, { uiContainer, toolbarContainer }) {
  return tinymce.init({
    target,
    inline: true,
    fixed_toolbar_container: toolbarContainer,
    toolbar_persist: true,
    plugins: ['lists', 'link'],
    toolbar: 'undo redo | styles | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist | link',
    menubar: false,
    ui_container: uiContainer,
    object_resizing: false,
    browser_spellcheck: true,
    contextmenu: false
  }).then((editors) => editors[0]);
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
      openImageBrowser(null, (fileName, imageUrl) => openWrapImageDialog(editor, imageUrl));
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

function openWrapImageDialog(editor, imageUrl) {
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
        // Named for the kind of logo rather than the shrink ratio these
        // map to on mobile (sm = 50%, md = 65%, desktop unaffected) -
        // the wide All-Star logos need the harder shrink, square
        // corporate marks don't. See .img-wrap-sm/md in styles.css.
        { type: 'selectbox', name: 'scale', label: 'Logo Type', items: [
          { value: 'sm', text: 'All-Star Logo' },
          { value: 'md', text: 'Corporate Logo' }
        ] },
        { type: 'input', name: 'alt', label: 'Alt Text' }
      ]
    },
    initialData: { float: 'left', scale: 'md', alt: '' },
    buttons: [
      { type: 'cancel', text: 'Cancel' },
      { type: 'submit', text: 'Insert', primary: true }
    ],
    onSubmit: (api) => {
      const data = api.getData();
      // 150px is the wrap-image standard (Corporate Logo + img-wrap-md
      // gives 97.5px on mobile). Inline rather than a CSS class: each
      // published image carries its own size, which a class would override.
      const html = `<img class="img-wrap-${data.float} img-wrap-${data.scale} mceNonEditable" contenteditable="false" style="width: 150px; height: 150px;" src="${imageUrl}" alt="${escapeHtml(data.alt)}">`;
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
    initialData: { alt: middleImageAltDefault() },
    buttons: [
      { type: 'cancel', text: 'Cancel' },
      { type: 'submit', text: 'Insert', primary: true }
    ],
    onSubmit: async (api) => {
      const data = api.getData();
      // width/height let the browser reserve the image's space before it loads (no layout shift).
      const size = await imageNaturalSize(imageUrl);
      const sizeAttrs = size ? ` width="${size.width}" height="${size.height}"` : "";
      const html = `<img class="card-middle-img mceNonEditable" contenteditable="false" src="${imageUrl}"${sizeAttrs} alt="${escapeHtml(data.alt)}">`;
      editor.insertContent(html);
      api.close();
    }
  });
}

// The image's real pixel size, or null if it can't be loaded within 10 seconds.
function imageNaturalSize(url) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 10000);
    img.onload = () => { clearTimeout(timer); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

// Middle images saved before the dialog recorded a size have none. Fill them in
// as a set opens (a kept width gets a proportional height); Update then saves them.
async function fillMiddleImageSizes(editor) {
  const missing = [...editor.getBody().querySelectorAll("img.card-middle-img")]
    .filter((img) => !img.getAttribute("width") || !img.getAttribute("height"));
  for (const img of missing) {
    const size = await imageNaturalSize(img.getAttribute("src"));
    if (!size) continue;
    const width = parseInt(img.getAttribute("width"), 10) || size.width;
    const height = Math.round(width * size.height / size.width);
    // ignore(): not an undo step, so Ctrl+Z can't strip it again.
    editor.undoManager.ignore(() => {
      editor.dom.setAttrib(img, "width", width);
      editor.dom.setAttrib(img, "height", height);
    });
  }
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

// --- SEO "Generate" buttons (createCardSet.html / setEdit.html) ---
// Each fills its field from the set's own form values: no AI, and nothing
// the form can't back up. A field that already has text asks first.

function seoFormValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

// "1991-92 Stadium Club" + maker Topps -> "1991-92 Topps Stadium Club Hockey".
function seoSetLabel() {
  const setName = seoFormValue("setName");
  const mfg = seoFormValue("mfg");
  const match = setName.match(/^(\d{4}-\d{2})\s+(.+)$/);
  const brandedSet = /mcdonald|tim hortons/i.test(setName);
  let label = setName;
  if (match && mfg && !brandedSet && !match[2].toLowerCase().includes(mfg.toLowerCase())) {
    label = `${match[1]} ${mfg} ${match[2]}`;
  }
  return /hockey/i.test(label) ? label : `${label} Hockey`;
}

function seoInsertNames() {
  return seoFormValue("subsets").split(",").map((name) => name.trim())
    .filter((name) => name && !/^(none|n\/a)$/i.test(name));
}

function buildSeoTitle() {
  const label = seoSetLabel();
  const withBrand = `${label} Card Set Review | Junk Wax Hockey`;
  return withBrand.length <= 65 ? withBrand : `${label} Card Set Review`;
}

// Base sentence, then each extra only if it still fits in 160 characters.
function buildSeoDescription() {
  const size = seoFormValue("size");
  const stars = seoFormValue("stars");
  const inserts = seoInsertNames();
  const editor = typeof tinymce !== "undefined" ? tinymce.get("postBody") : null;
  const firstParagraph = editor
    ? editor.getContent({ format: "text" }).split(/\n+/).map((line) => line.trim()).find(Boolean) || ""
    : "";
  const firstSentence = (firstParagraph.match(/^.+?[.!?](?=\s|$)/) || [""])[0];

  const facts = [];
  if (size && inserts.length) facts.push(`${size} cards. Inserts: ${inserts.join(", ")}.`);
  if (size) facts.push(`${size} cards.`);
  if (!size && inserts.length) facts.push(`Inserts: ${inserts.join(", ")}.`);

  let text = `${seoSetLabel()} card set review.`;
  [facts, stars ? [`Hella Rating: ${stars}/5.`] : [], firstSentence ? [firstSentence] : []].forEach((options) => {
    const fit = options.find((option) => (text + " " + option).length <= 160);
    if (fit) text += " " + fit;
  });
  return truncateAtWord(text, 160);
}

function buildSeoKeywords() {
  const setName = seoFormValue("setName");
  const year = (setName.match(/^\d{4}(-\d{2})?/) || [""])[0];
  const terms = [seoSetLabel(), year && `${year} hockey cards`, seoFormValue("mfg"),
    setName && `${setName} checklist`, "junk wax hockey", ...seoInsertNames()];
  const seen = new Set();
  return terms.filter((term) => term && !seen.has(term.toLowerCase()) && seen.add(term.toLowerCase()))
    .slice(0, 12).join(", ");
}

function buildSeoSlug() {
  return seoFormValue("setName").toLowerCase().replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function fillSeoField(fieldId, build) {
  if (!seoFormValue("setName")) {
    await cmsAlert("Enter the Set Name first - the generators build from the set's own details.");
    return;
  }
  const field = document.getElementById(fieldId);
  const value = build();
  if (field.value.trim() && field.value.trim() !== value) {
    if (!(await cmsConfirm("Replace the current text in this field with a generated version?"))) return;
  }
  field.value = value;
  updateSeoCharCounts();
}

function generateSeoTitle() { return fillSeoField("seoPageTitle", buildSeoTitle); }
function generateSeoDescription() { return fillSeoField("seoMetaDesc", buildSeoDescription); }
function generateSeoKeywords() { return fillSeoField("seoTags", buildSeoKeywords); }
function generateSeoSlug() { return fillSeoField("seoURLSlug", buildSeoSlug); }

// Grows or shrinks a textarea to exactly fit its text (borders included). A
// hidden box measures 0, so it keeps its CSS height until it can be measured.
function autosizeTextarea(box) {
  box.style.height = "auto";
  if (box.scrollHeight) box.style.height = `${box.scrollHeight + box.offsetHeight - box.clientHeight}px`;
}

// "58 / 65": the length against the most a search result shows. Also refits
// the two multi-line boxes, since every programmatic fill comes through here.
function updateSeoCharCounts() {
  ["seoMetaDesc", "seoTags"].forEach((id) => {
    const box = document.getElementById(id);
    if (box) autosizeTextarea(box);
  });
  [["seoPageTitle", 65], ["seoMetaDesc", 160]].forEach(([id, max]) => {
    const input = document.getElementById(id);
    const counter = document.getElementById(`${id}Count`);
    if (!input || !counter) return;
    counter.textContent = `${input.value.length} / ${max}`;
    counter.classList.toggle("seo-count-over", input.value.length > max);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ["seoPageTitle", "seoMetaDesc"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("input", updateSeoCharCounts);
  });
  // The multi-line boxes are for room, not line breaks: Enter is blocked and a
  // pasted break becomes a space, so a meta tag never contains one.
  const lineBreaks = /\s*[\r\n]+\s*/g;
  ["seoMetaDesc", "seoTags"].forEach((id) => {
    const box = document.getElementById(id);
    if (!box) return;
    box.addEventListener("keydown", (event) => { if (event.key === "Enter") event.preventDefault(); });
    box.addEventListener("input", () => {
      if (/[\r\n]/.test(box.value)) {
        const caret = box.value.slice(0, box.selectionStart).replace(lineBreaks, " ").length;
        box.value = box.value.replace(lineBreaks, " ");
        box.setSelectionRange(caret, caret);
      }
      updateSeoCharCounts();
    });
  });
});

// Middle images are shots of the set's cards, so alt can start from the set.
function middleImageAltDefault() {
  const year = seoFormValue("year");
  const mfg = seoFormValue("mfg");
  return year && mfg ? `Vintage hockey cards from the ${year} ${mfg} set` : "";
}
