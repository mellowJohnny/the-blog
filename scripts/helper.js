/** HELPER FUNCTIONS *** HELPER FUNCTIONS *** HELPER FUNCTIONS *** HELPER FUNCTIONS */

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
    const weekDay = getDayOfTheWeek(dayNum);

    // Get the month as an Integer, convert it to the name
    const monthNum = d.getMonth(); 
    const month = getMonthName(monthNum);
    // Get the year
    const year = d.getFullYear(); 

    // Gets the day of the month
    const dateNum = d.getDate(); 

    // Smoosh it all together and send it back...
    return weekDay + ", " + month + " " + dateNum + ", " + year;
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


// NEW Modular Object based approach to replace fetchCardIntro()
// First, define the Object and the HTML we want to put in it
// The when the function is called, the key is passed in and is matched to a value holding the appropriate HTML
// This approach removes the need for if / else if / else statements
const cardIntros = {
    classicWax: `
        <p>Non Junk Wax...classic wax? Modern era? Whatever you call it, the O-Pee-Chee sets from Gretzky's debut in the 1979-80 set right up to 
        the Roy and Lemieux years defined a classic period of card collecting.</p>
        <p>The 8 sets from the pre-boom era include not only Gretzky, Roy, and Lemieux
        but also Messier, Bourque, Coffey, Savard, Fuhr, Hawerchuck, Carbonneau, Yzerman, Gilmour, and MacInnis. Quite a Hall of Fame class.</p>
    `,

    timmies: `
        <p>When McDonald's Canada shut down their association with the NHL in 2010, nearly 20 years of fast food hockey card collecting went with it. 
        But in 2015, after a five year absence, fast food hockey card collecting was back! Tim Hortons, the bastion of blue-collar coffee shops, 
        released their very first NHL Hockey set for the 2015-16 season. <br><br>
        But they didn't just mail it in - it was a modern, 100 card Upper Deck base set, complete with custom binder and loads of chase cards. <br><br>
        It also started their tradition of kicking off the set with a Tim Horton card, putting Sydney Crosby on the pack and the binder, and releasing the set 
        in early October each year.</p>
    `,

    junkWax: `
        <p>The late '80s and early '90s...Miami Vice, acid wash jeans, those teal San Jose Sharks jerseys...and a hockey card explosion. 
        Here's a stat for you: for the 1989-90 season there were just two hockey sets produced - Topps for the US and O-Pee-Chee for Canada. But just three years later there were no less than thirteen (!) sets available to US and Canadian collectors.
        So you can see why, with the sheer volume of cards produced during these heady days, the era earned the <i><a href="cards.html">Junk Wax</a></i> moniker.  
        <br><br>
        But there are some hidden gems to be found if you are willing to sift through the rubble. So let's start diggin'!</p>
    `
};

function fetchCardIntro(pageName) {
    const blogIntro = document.getElementById("card-intro");

    // fallback to junkWax if the key doesn't exist
    const html = cardIntros[pageName] || cardIntros.junkWax;

    blogIntro.innerHTML = html;
}


//****** Helper Function For Rendering "smart" Set-O-Matic Year Picker (removes link for current year) *********
// Used to render both "Classic" and "Junk Wax" pickers
// NEW DYNAMIC version - no more enormous list of if statements
// How this works
// Ranges: You only define the start/end years once per category. No duplication.
// Dynamic labels: The label 1979-80 is generated automatically by combining the year and the next year.
// Highlighting: The selected year is shown as plain text, others as links.
// Scalability: Adding new years is as simple as extending the range.
// This way, instead of maintaining hundreds of lines of repetitive HTML, you only maintain the ranges. Much easier to extend and debug.

function renderSetPicker(year) {
  const setPicker = document.getElementById("set-picker");

  // Define ranges and categories
  // End year gets 1 added, so end: 2025 generates "2025-26"
  const ranges = [
    { start: 1979, end: 1986, className: "classic-set-nav-td", pageName: "classicWax" },
    { start: 1987, end: 1993, className: "junk-set-nav-td", pageName: "junkWax" },
    { start: 2020, end: 2025, className: "junk-set-nav-td", pageName: "timmies" }
  ];

  // Find which range the year belongs to
  const range = ranges.find(r => year >= r.start && year <= r.end);
  if (!range) {
    setPicker.innerHTML = `<p>No template found for ${year}</p>`;
    return;
  }

  // Build table cells
  let cells = "";
  for (let y = range.start; y <= range.end; y++) {
    const label = `${y}-${(y + 1).toString().slice(-2)}`; // e.g. 1979-80, 1980-81
    if (y === parseInt(year)) {
      // Current year: plain text
      cells += `<td class="${range.className}">${label}</td>`;
    } else {
      // Other years: link
      cells += `<td class="${range.className}"><a href="/waxReviews.html?year=${y}&pageName=${range.pageName}">${label}</a></td>`;
    }
  }

  // Wrap in table
  setPicker.innerHTML = `
    <table class="card-set-nav">
      <tr>${cells}</tr>
    </table>
  `;
}



/** Helper Function to dynamically fetch Navigation 
 * Refactored to use Object Maps and dynamic tables
 * Adding a new page = add one line to const NAV_MAP
 * Adding a new menu item = add one entry to const NAV_ITEMS
*/

// Step 1: Define the navigation items as data
const NAV_ITEMS = {
  home: { label: "Home", href: "/index.html" },
  junk: { label: "90s Hockey Sets", href: "/waxReviews.html?year=1987&pageName=junkWax" },
  classic: { label: "80s Hockey Sets", href: "/waxReviews.html?year=1979&pageName=classicWax" },
  timmies: { label: "Tim Hortons Hockey", href: "/waxReviews.html?year=2020&pageName=timmies" },
  tech: { label: "Tech", href: "/tech.html?blogType=1" },
  pi: { label: "Raspberry Pi", href: "/tech.html?blogType=5" }
};

// ...and the dropdown
const MACH_E_DROPDOWN = {
  label: "Mustang Mach-E",
  items: [
    { label: "Mach-E Blog", href: "/tech.html?blogType=3" },
    { label: "Power-Up Software Updates", href: "/tech.html?blogType=4" }
  ]
};

// Step 2: Define which pages show which items
// The key is the page name, the values are the links to display, in the order they appear
const NAV_MAP = {
  index: ["home", "classic", "junk",  "timmies", "tech", "pi", "machE"],

  tech_1: ["home", "classic", "junk",  "timmies", "pi", "machE"],
  tech_3: ["home", "classic", "junk",  "timmies", "tech", "pi",  "machE"],
  tech_4: ["home", "classic", "junk",  "timmies", "tech", "pi",  "machE"],
  tech_5: ["home", "classic", "junk",  "timmies", "tech", "machE"],

  ev: ["home", "classic", "junk",  "timmies", "tech", "pi", "machE"],

  junkWax: ["home", "classic", "timmies", "tech", "pi",  "machE"],
  classicWax: ["home", "junk", "timmies", "tech", "pi",  "machE"],
  timmies: ["home", "classic", "junk", "tech", "pi",  "machE"]
};

// Step 3: Build a dynamic table generator
function buildNavCell(item) {
  return `<td class="nav-td"><a href="${item.href}">${item.label}</a></td>`;
}

function buildDropdown(drop) {
  const links = drop.items
    .map(i => `<a href="${i.href}">${i.label}</a><br><br>`)
    .join("");

  return `
    <td class="nav-td">
      <div class="dropdown">
        <span>${drop.label}</span>
        <div class="dropdown-content">${links}</div>
      </div>
    </td>
  `;
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
    if (id === "machE") {
      cells += buildDropdown(MACH_E_DROPDOWN);
    } else {
      cells += buildNavCell(NAV_ITEMS[id]);
    }
  });

  nav.innerHTML = `
    <table class="top-nav">
      <tr>${cells}</tr>
    </table>
  `;
}

// --------------- Cookie! --------------------------

function setCookie(cookieName, cookieValue, exp) {
    const d = new Date();
    d.setTime(d.getTime() + (exp*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cookieName + "=" + cookieValue + ";" + expires + ";path=/";
  }
