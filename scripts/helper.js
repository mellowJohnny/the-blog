/** HELPER FUNCTIONS *** HELPER FUNCTIONS *** HELPER FUNCTIONS *** HELPER FUNCTIONS */

/** 
 * Helper function to estimate reading time for blogs OR cardsets
 */

function estimateReadingTime(htmlString) {
  // Strip HTML tags so we only count real words
  const text = htmlString.replace(/<[^>]*>/g, " ");

  // Split on whitespace and filter out empty entries
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);

  const wordCount = words.length;

  // Average reading speed: 225 words per minute
  const minutes = Math.ceil(wordCount / 225);

  return {
    wordCount,
    minutes
  };
}


   // ----------------------------- Date Helper Functions ----------------------------

   /**
    * Formats our Raw Date object coming back from the JSON response
    * @param {*} date 
    * @returns 
    */

   function fixDate(date){
    const d = new Date(date);
    // Get the day of the week as an Integer, then convert it to the name of the day
    const dayNum = d.getDay();
    // const weekDay = getDayOfTheWeek(dayNum); Removing for now

    // Get the month as an Integer, convert it to the name
    const monthNum = d.getMonth(); 
    const month = getMonthName(monthNum);
    // Get the year
    const year = d.getFullYear(); 

    // Gets the day of the month
    const dateNum = d.getDate(); 

    // Smoosh it all together and send it back...
    // return weekDay + ", " + month + " " + dateNum + ", " + year; OLD, long version

    return month + " " + dateNum + ", " + year;
}

   /**
 * Helper function to get the month name, given an Integer value
 * @param {*} month 
 * Refactored to us Object Map
 */
function getMonthName(monthNum) {
  const months = {
    0: "January",
    1: "February",
    2: "March",
    3: "April",
    4: "May",
    5: "June",
    6: "July",
    7: "August",
    8: "September",
    9: "October",
    10: "November",
    11: "December"
  };

  return months[monthNum] || null; // or "Invalid month"
}

/**
 * Helper function to get the day name, given an Integer value
 * @param {*} day 
 * Refactored to use an Object Map
 */

function getDayOfTheWeek(dayNum) {
  const days = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday"
  };

  return days[dayNum] || null; // or "Invalid day"
}



    // ************* Helper functions to change CMS Submit state *************

    // Change the submit button colour & text on Submit
    function submitButtonClicked() {
        document.getElementById('regSubmitButton').style.backgroundColor = "#36a5e6";
        document.getElementById('regSubmitButton').innerHTML = "Crossing Fingers...";
    }

    // Post-Submit - change the CREATE submit button colour & text back to initial state 
    function submitButtonReset() {
        setTimeout(changeMeBack, 1500);
    }

    function changeMeBack(){
        document.getElementById('regSubmitButton').style.backgroundColor = "#256386";
        document.getElementById('regSubmitButton').innerHTML = "sign Me UP!";
    }


    //************ Helper Function To Generate Copyright Date for any <div id="copy"> tag ********************
    function fetchCopyrightYear() {
        const copyYear = new Date().getFullYear();
        let copyFooter = document.getElementById("copy");
        copyFooter.innerHTML = `<p>&copy; ${copyYear} Christian Couillard </p>`;
        
    }

// -------------------- Helper Function for Sorting Blog Posts ----------------------
// When "order" is "first", newest blogs first
// When "order" is "last", oldest blogs first
// Default is newest blogs first

function getSortOrder(property,order) {    
    return function(a, b) {    
        if (a[property] > b[property]) { 
            if (order === "first") {
                return -1;
            }  
            else if (order === "last") {
                return 1;
            }
            else {
                return -1;
            }
                
        } else if (a[property] < b[property]) { 
            if (order === "first") {
                return 1;
            }  
            else if (order === "last") {
                return -1;
            }
            else {
                return 1;
            }    
        }   
        else {
            if (a[property] > b[property]) { 
                if (order === "first") {
                    return -1;
                }  
                else if (order === "last") {
                    return 1;
                }
                else {
                    return -1;
                }
            } 
        return 0;    
            }    
    }
} // end sort function

// -------------------- Helper Function for Sorting Card Set Posts ----------------------
// CardSetSorter Function - Sorts Card Set Reviews by number of stars...
// When "order" is "first", highest stars first
// When "order" is "last", lowest stars first
// Default is highest stars first
function cardSetSorter(property,order) {  
   // console.log(`Sort Order is: ${order}`)  
    return function(a, b) {    
        if (a[property] > b[property]) { 
            if (order === "first") {
                return -1;
            }  
            else if (order === "last") {
                return 1;
            }
            else {
                return -1;
            }
                
        } else if (a[property] < b[property]) { 
            if (order === "first") {
                return 1;
            }  
            else if (order === "last") {
                return -1;
            }
            else {
                return 1;
            }    
        }   
        else {
            if (a[property] > b[property]) { 
                if (order === "first") {
                    return -1;
                }  
                else if (order === "last") {
                    return 1;
                }
                else {
                    return -1;
                }
            } 
        return 0;    
            }    
    }
} // end sort function


// -------------------------------- Set-O-Matic Year Picker --------------------------------------
// Used to render all pickers: "Classic", "Junk Wax", "Timmies" and "McDonalds" 
// NEW DYNAMIC version - no more enormous list of if statements
// How this works
// Ranges: You only define the start/end years once per category. No duplication.
// Dynamic labels: The label 1979-80 is generated automatically by combining the year and the next year.
// Highlighting: The selected year is shown as plain text, others as links.
// Scalability: Adding new years is as simple as extending the range.
// This way, instead of maintaining hundreds of lines of repetitive HTML, you only maintain the ranges. Much easier to extend and debug.

function renderSetPicker(year, blogCat, pageName) {
  const setPicker = document.getElementById("set-picker");

  // Category + pageName specific ranges
  const categoryRanges = {
    reg: {
      classicWax: { start: 1979, end: 1986, className: "junk-set-nav-td", pageName: "classicWax" },
      junkWax:    { start: 1987, end: 1993, className: "junk-set-nav-td", pageName: "junkWax" }
    },
    mcd: {
      mcd: { start: 1991, end: 2001, className: "junk-set-nav-td", pageName: "mcd" }
    },
    tims: {
      timmies: { start: 2020, end: 2025, className: "junk-set-nav-td", pageName: "timmies" }
    }
  };

  const catConfig = categoryRanges[blogCat];
  if (!catConfig) {
    setPicker.innerHTML = `<p>No template found for category "${blogCat}"</p>`;
    return;
  }

  const range = catConfig[pageName];
  if (!range) {
    setPicker.innerHTML = `<p>No range found for category "${blogCat}" and page "${pageName}"</p>`;
    return;
  }

  let row1 = "", row2 = "";
  const totalYears = range.end - range.start + 1;
  const splitIndex = blogCat === "mcd" ? Math.ceil(totalYears / 2) : totalYears;

  for (let i = 0; i < totalYears; i++) {
    const y = range.start + i;
    const label = `${y}-${(y + 1).toString().slice(-2)}`;

    const cell = (y === parseInt(year))
      ? `<td class="${range.className}">${label}</td>`
      : `<td class="${range.className}">
           <a href="/waxReviews.html?year=${y}&pageName=${range.pageName}&blogCat=${blogCat}">
             ${label}
           </a>
         </td>`;

    if (i < splitIndex) row1 += cell;
    else row2 += cell;
  }

  const rows = blogCat === "mcd"
    ? `<tr style="text-align: center;">${row1}</tr><br><br><tr>${row2}</tr>`
    : `<tr style="text-align: center;">${row1}</tr>`;

  setPicker.innerHTML = `
    <table class="card-set-nav">
      ${rows}
    </table>
  `;
}





/** Helper Function to dynamically fetch ------------ TOP LEVEL NAVIGATION -----------------------
 * Refactored to use Object Maps and dynamic tables
 * Adding a new page = add one line to const NAV_MAP
 * Adding a new menu item = add one entry to const NAV_ITEMS
*/

// Step 1: Define the navigation items as data
const NAV_ITEMS = {
  home: { label: "Home", href: "/index.html" },
  junk: { label: "90s Hockey Sets", href: "/waxReviews.html?year=1987&pageName=junkWax&blogCat=reg" },
  classic: { label: "80s Hockey Sets", href: "/waxReviews.html?year=1979&pageName=classicWax&blogCat=reg" },
  timmies: { label: "Tim Hortons Hockey", href: "/waxReviews.html?year=2020&pageName=timmies&blogCat=tims" },
  mcd: { label: "McHockey", href: "/waxReviews.html?year=1991&pageName=mcd&blogCat=mcd" },
  tech: { label: "Tech", href: "/tech.html?blogType=1" },
  pi: { label: "Raspberry Pi", href: "/tech.html?blogType=5" },
  mache: { label: "Mustang Mach-E", href: "/tech.html?blogType=3" }
};

// Step 2: Define which pages show which items
// The key is the page name, the values are the links to display, in the order they appear
const NAV_MAP = {
  index: ["home", "classic", "junk", "mcd", "timmies", "tech", "pi", "mache"],
  tech_1: ["home", "classic", "junk", "mcd", "timmies", "pi", "mache"],
  tech_3: ["home", "classic", "junk", "mcd", "timmies", "tech", "pi",  "mache"],
  tech_4: ["home", "classic", "junk", "mcd", "timmies", "tech", "pi",  "mache"],
  tech_5: ["home", "classic", "junk", "mcd", "timmies", "tech", "mache"],
  ev: ["home", "classic", "junk", "mcd", "timmies","tech", "pi", "mache"],
  junkWax: ["home", "classic", "mcd", "timmies", "tech", "pi",  "mache"],
  classicWax: ["home", "junk", "mcd", "timmies", "tech", "pi",  "mache"],
  timmies: ["home", "classic", "junk", "mcd", "tech", "pi",  "mache"],
  mcd: ["home", "classic", "junk", "timmies", "tech", "pi",  "mache"]
};

// Step 3: Build a dynamic table generator
function buildNavCell(item) {
  return `<td class="nav-td"><a href="${item.href}">${item.label}</a></td>`;
}

// The new, dynamic fetchNav()
function fetchNav(pageName, blogType) {
  const nav = document.getElementById("global-nav");

  // Determine key (e.g. "tech_1", "tech_3")
  const key = blogType ? `${pageName}_${blogType}` : pageName;

  const items = NAV_MAP[key];
  if (!items) return;

  
  let cells = "";

  items.forEach(id => {
      cells += buildNavCell(NAV_ITEMS[id]);
  });

  nav.innerHTML = `
    <table class="top-nav nav-table">
      <tr>${cells}</tr>
    </table>
  `;
}

// Hamberger Menu Toggle
function toggleMenu() {
  const nav = document.getElementById("global-nav");
  nav.classList.toggle("open");
}



// --------------- Cookie! --------------------------

function setCookie(cookieName, cookieValue, exp) {
    const d = new Date();
    d.setTime(d.getTime() + (exp*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cookieName + "=" + cookieValue + ";" + expires + ";path=/";
  }
