

/** This Script defines the generic CMS form UI helpers shared by every
 * create/update page: TinyMCE setup and the submit-button state feedback.
 * Split out of the old cms.js monolith - see scripts/cmsBlog.js and
 * scripts/cmsCardSet.js for the actual blog/card-set CRUD logic that
 * used to live alongside this.
 */

/**
 * -------------------------------------------- TinyMCE GLOBAL config!
 *
 * This function is called from every CMS page, allowing for a single place to contol the WYSIWYG editor
 */

function initTinyEditor(selector = '#postBody')
{ tinymce.init({
  selector: selector,
  plugins: ['lists', 'link', 'image', 'code', 'autoresize'],
  toolbar: 'undo redo | styles | bold italic | alignleft aligncenter alignright alignjustify | outdent indent | bullist numlist | link image lists code | wordcount',
  width: 1000,
  browser_spellcheck: true,
  min_height: 400, // The starting/minimum height
  max_height: 500  // The maximum limit before a scrollbar appears
  });
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
