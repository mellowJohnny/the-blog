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
 */
    function getMonthName(monthNum){
        if (monthNum === 0){
            month = "January";
            return month;
        }
        if (monthNum === 1){
            month = "February";
            return month;
        }
        if (monthNum === 2){
            month = "March";
            return month;
        }
        if (monthNum === 3){
            month = "April";
            return month;
        }
        if (monthNum === 4){
            month = "May";
            return month;
        }
        if (monthNum === 5){
            month = "June";
            return month;
        }
        if (monthNum === 6){
            month = "July";
            return month;
        }
        if (monthNum === 7){
            month = "August";
            return month;
        }
        if (monthNum === 8){
            month = "September";
            return month;
        }
        if (monthNum === 9){
            month = "October";
            return month;
        }
        if (monthNum === 10){
            month = "November";
            return month;
        }
        if (monthNum === 11){
            month = "December";
            return month;
        }
    }

/**
 * Helper function to get the day name, given an Integer value
 * @param {*} day 
 */
     function getDayOfTheWeek(dayNum){

        if (dayNum === 1){
            dayName = "Monday";
            return dayName;
        }
        if (dayNum === 2){
            dayName = "Tuesday";
            return dayName;
        }
        if (dayNum === 3){
            dayName = "Wednesday";
            return dayName;
        }
        if (dayNum === 4){
            dayName = "Thursday";
            return dayName;
        }
        if (dayNum === 5){
            dayName = "Friday";
            return dayName;
        }
        if (dayNum === 6){
            dayName = "Saturday";
            return dayName;
        }
        if (dayNum === 0){
            dayName = "Sunday";
            return dayName;
        }
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
    console.log(`Sort Order is: ${order}`)  
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

// --------- Dynamic Intro Function --------------
// This function takes a single blogType parameter and generates the correct header for the page
// since each blogType essentially needs it's own introduction section
// blogType 1 = tech
// blogType 3 = mach-e
// blogType 4 = mach-e sync updates

function fetchIntro(blogType){
    let blogIntro = document.getElementById("blog-intro");
    let blogHeader = document.getElementById("section-header");
    if (blogType === "1") {
        blogIntro.innerHTML = `
        <p>Tech is a bit of a catch-all for semi-sorta-kinda tech related rants, observations, and professional opinions. Oh, and that animated airplane gif? That is the 
        world's first gif, created by <a href="https://en.wikipedia.org/wiki/Steve_Wilhite"></a>Steve Wilhite</a>. Cool huh? </p>
        `;
        blogHeader.innerHTML = `
        <H1>...the tech blog</H1>`;
    }
    else if (blogType === "3") {
        blogIntro.innerHTML = `
        <p>Say hello to Lucy! Impressions on owning and driving our first EV, with other EV related thoughts, impressions, and completely biased commentary 
                </p>`;
        blogHeader.innerHTML = ` <H1>...the mach-e blog</H1>`;
    }
    else if (blogType === "4") {
        blogIntro.innerHTML = `
        <p>One of the super-cool party tricks the Mach-E has is Over-The-Air updates, which Ford calls a "Power-Up". For those of you new to the term, which has been around for quite a while, is the ability
        for a piece of "hardware" to receive a software update "over the air" - i.e. via the internet. Could be WiFi, could be a 3 / 4 / 5G connection. The point is you don't need to 
        visit a dealer for them to "flash" a module or system with a new update. It happens automagically. And in the case of the Mach-E, 
        not just an update to the maps for the Nav system. </p>
        <p>We're talking actual, useful changes to things that in the past would likely have only been rolled out with a new model year. Allowing the core software in key control modules 
        to be updated with OTA updates is, as pioneered by Tesla, game chaging. And I really hate that word...but it really is.</p>
        <p>Since the Mach-E began hitting dealerships in 2021 there have been some pretty significant tweaks & modifications delivered via OTA updates, including 
        things like modifications to the charging curve, battery capacity increase, brake pedal feel changes, rolling out BlueCruise, a complete SYNC UI refresh, HVAC changes,
        adding battery preconditioning prior to DCFC stops, and new games. 
        <p>The process has not always been smooth for all owners, but when you consider that in the first two years of its existance the Mach-E was one of the few 
        electric vehicles with OTA capabilities, its pretty cool stuff.</p>
        `;
    }
    else if (blogType === "5") {
        blogIntro.innerHTML = `
        <p>Let's see what kinda trouble we can get into with a Raspberry Pi 4 :-)</p>
        `;
        blogHeader.innerHTML = `
        <H1>...the raspberry pi blog</H1>`;
    }
}

// --------- Dynamic Intro Function --------------
// This function takes a single blogType parameter and generates the correct header for the page
// since each blogType essentially needs it's own introduction section
function fetchCardIntro(year){
    let blogIntro = document.getElementById("card-intro");
    if (year <= "1986") {
        // 1986 is the last "classic wax" year, so if the year param is less than or equal to 1986, must be classic wax...
        blogIntro.innerHTML = `
        <p>Non Junk Wax...classic wax? Modern era? Whatever you call it, the O-Pee-Chee sets from Gretzky's debut in the 1979-80 set right up to 
        the Roy and Lemieux years defined a classic period of card collecting.</p>
        <p> The 8 sets from the pre-boom era include not only Gretzky, Roy, and Lemieux
        but also Messier, Bourque, Coffey, Savard, Fuhr, Hawerchuck, Carbonneau, Yzerman, Gilmour, and MacInnis. Quite a Hall of Fame class.
        </p>`;
    }
    else {
        // must be Junk Wax
        blogIntro.innerHTML = `
        <p>Ah...the late '80s / early '90s...Miami Vice, acid wash jeans, those teal San Jose Sharks jerseys...and a hockey card explosion. 
        Here's a stat for you: for the 1989-90 season there were just two hockey sets produced - Topps for the US and O-Pee-Chee for Canada. But just three years later there were no less than thirteen (!) sets available to US and Canadian collectors.
        So you can see why, with the sheer volume of cards produced during these heady days, the era earned the <i><a href="cards.html">Junk Wax</a></i> moniker.  
        <br><br>
          But there <i>are</i> some hidden gems to be found if you are willing to sift through the rubble.  So let's start diggin'!
        </p>
        `;
    }
} // end fetchCardIntro


//****** Helper Function For Rendering "smart" Set-O-Matic Year Picker (removes link for current year) *********
// Yes, it's a huge switch statement... :-)
// Used to render both "Classic" and "Junk Wax" pickers

function renderSetPicker(year){
   // let year = pickerYear;
    let setPicker = document.getElementById("set-picker");
    if (year === "1979"){
        setPicker.innerHTML = `
        <table class="card-set-nav">
            <tr>
                <td class="classic-set-nav-td">1979-80</td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1980&pageName=classicWax">1980-81</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1981&pageName=classicWax">1981-82</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1982&pageName=classicWax">1982-83</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1983&pageName=classicWax">1983-84</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1984&pageName=classicWax">1984-85</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1985&pageName=classicWax">1985-86</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1986&pageName=classicWax">1986-87</a></td>
            </tr>
        </table>`;
    }
    else if (year === "1980") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
            <tr>
            <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1979&pageName=classicWax">1979-80</td>
            <td class="classic-set-nav-td">1980-81</td>
            <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1981&pageName=classicWax">1981-82</a></td>
            <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1982&pageName=classicWax">1982-83</a></td>
            <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1983&pageName=classicWax">1983-84</a></td>
            <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1984&pageName=classicWax">1984-85</a></td>
            <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1985&pageName=classicWax">1985-86</a></td>
            <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1986&pageName=classicWax">1986-87</a></td>
            </tr>
        </table>`;
    }
    else if (year === "1981") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
            <tr>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1979&pageName=classicWax">1979-80</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1980&pageName=classicWax">1980-81</a></td>
                <td class="classic-set-nav-td">1981-82</td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1982&pageName=classicWax">1982-83</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1983&pageName=classicWax">1983-84</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1984&pageName=classicWax">1984-85</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1985&pageName=classicWax">1985-86</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1986&pageName=classicWax">1986-87</a></td>
            </tr>
        </table>`;
    }
    else if (year === "1982") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
            <tr>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1979&pageName=classicWax">1979-80</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1980&pageName=classicWax">1980-81</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1981&pageName=classicWax">1981-82</a></td>
                <td class="classic-set-nav-td">1982-83</td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1983&pageName=classicWax">1983-84</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1984&pageName=classicWax">1984-85</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1985&pageName=classicWax">1985-86</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1986&pageName=classicWax">1986-87</a></td>
            </tr>
        </table>`;
    }
    else if (year === "1983") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
            <tr>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1979&pageName=classicWax">1979-80</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1980&pageName=classicWax">1980-81</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1981&pageName=classicWax">1981-82</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1982&pageName=classicWax">1982-83</a></td>
                <td class="classic-set-nav-td">1983-84</td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1984&pageName=classicWax">1984-85</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1985&pageName=classicWax">1985-86</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1986&pageName=classicWax">1986-87</a></td>
            </tr>
        </table>`;
    }
    else if (year === "1984") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
            <tr>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1979&pageName=classicWax">1979-80</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1980&pageName=classicWax">1980-81</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1981&pageName=classicWax">1981-82</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1982&pageName=classicWax">1982-83</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1983&pageName=classicWax">1983-84</a></td>
                <td class="classic-set-nav-td">1984-85</td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1985&pageName=classicWax">1985-86</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1986&pageName=classicWax">1986-87</a></td>
            </tr>
        </table>`;
    }
    else if (year === "1985") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
            <tr>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1979&pageName=classicWax">1979-80</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1980&pageName=classicWax">1980-81</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1981&pageName=classicWax">1981-82</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1982&pageName=classicWax">1982-83</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1983&pageName=classicWax">1983-84</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1984&pageName=classicWax">1984-85</a></td>
                <td class="classic-set-nav-td">1985-86</td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1986&pageName=classicWax">1986-87</a></td>
            </tr>
        </table>`;
    }
    else if (year === "1986") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
            <tr>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1979&pageName=classicWax">1979-80</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1980&pageName=classicWax">1980-81</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1981&pageName=classicWax">1981-82</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1982&pageName=classicWax">1982-83</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1983&pageName=classicWax">1983-84</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1984&pageName=classicWax">1984-85</a></td>
                <td class="classic-set-nav-td"><a href="/waxReviews.html?year=1985&pageName=classicWax">1985-86</a></td>
                <td class="classic-set-nav-td">1986-87</td>
            </tr>
        </table>`;
    }
    else if (year === "1987"){
        setPicker.innerHTML = `
        <table class="card-set-nav">
                <tr>
                    <td class="junk-set-nav-td">1987-88</td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1988&pageName=junkWax">1988-89</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1989&pageName=junkWax">1989-90</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1990&pageName=junkWax">1990-91</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1991&pageName=junkWax">1991-92</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1992&pageName=junkWax">1992-93</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1993&pageName=junkWax">1993-94</a></td> 
                </tr>
              </table>`;
    }
    else if (year === "1988") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
                <tr>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1987&pageName=junkWax">1987-88</a></td>
                    <td class="junk-set-nav-td">1988-89</td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1989&pageName=junkWax">1989-90</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1990&pageName=junkWax">1990-91</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1991&pageName=junkWax">1991-92</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1992&pageName=junkWax">1992-93</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1993&pageName=junkWax">1993-94</a></td> 
                </tr>
              </table>`;
    }
    else if (year === "1989") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
                <tr>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1987&pageName=junkWax">1987-88</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1988&pageName=junkWax">1988-89</a></td>
                    <td class="junk-set-nav-td">1989-90</td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1990&pageName=junkWax">1990-91</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1991&pageName=junkWax">1991-92</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1992&pageName=junkWax">1992-93</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1993&pageName=junkWax">1993-94</a></td> 
                </tr>
              </table>`;
    }
    else if (year === "1990") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
                <tr>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1987&pageName=junkWax">1987-88</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1988&pageName=junkWax">1988-89</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1989&pageName=junkWax">1989-90</a></td>
                    <td class="junk-set-nav-td">1990-91</td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1991&pageName=junkWax">1991-92</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1992&pageName=junkWax">1992-93</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1993&pageName=junkWax">1993-94</a></td> 
                </tr>
              </table>`;
    }
    else if (year === "1991") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
                <tr>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1987&pageName=junkWax">1987-88</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1988&pageName=junkWax">1988-89</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1989&pageName=junkWax">1989-90</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1990&pageName=junkWax">1990-91</a></td>
                    <td class="junk-set-nav-td">1991-92</td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1992&pageName=junkWax">1992-93</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1993&pageName=junkWax">1993-94</a></td> 
                </tr>
              </table>`;
    }
    else if (year === "1992") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
                <tr>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1987&pageName=junkWax">1987-88</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1988&pageName=junkWax">1988-89</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1989&pageName=junkWax">1989-90</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1990&pageName=junkWax">1990-91</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1991&pageName=junkWax">1991-92</a></td>
                    <td class="junk-set-nav-td">1992-93</td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1993&pageName=junkWax">1993-94</a></td> 
                </tr>
              </table>`;
    }
    else if (year === "1993") {
        setPicker.innerHTML = `
        <table class="card-set-nav">
                <tr>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1987&pageName=junkWax">1987-88</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1988&pageName=junkWax">1988-89</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1989&pageName=junkWax">1989-90</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1990&pageName=junkWax">1990-91</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1991&pageName=junkWax">1991-92</a></td>
                    <td class="junk-set-nav-td"><a href="/waxReviews.html?year=1992&pageName=junkWax">1992-93</a></td>
                    <td class="junk-set-nav-td">1993-94</td> 
                </tr>
              </table>`;
    } 
} // end set-o-matic year picker


/** Helper Function to dynamically fetch Navigation */

function fetchNav(pageName,blogType){
    let nav = document.getElementById("global-nav");

    if (pageName === "index") {
        nav.innerHTML = `
        <table class="top-nav">
        <tr>
          <td class="nav-td"><a href="/waxReviews.html?year=1987&pageName=junkWax">90s Hockey Junk Wax</a> </td>
          <td class="nav-td"><a href="/waxReviews.html?year=1979&pageName=classicWax">Classic 80s Hockey Sets</a> </td>
          <td class="nav-td"><a href="/tech.html?blogType=1">Tech Stuff</a> </td>
          <td class="nav-td"><a href="/tech.html?blogType=5">Raspberry Pi</a> </td>
         <!-- Dynamic menu stuff...-->
          <td class="nav-td">
            <div class="dropdown">
              <span>Mustang Mach-E</span>
                <div class="dropdown-content">
                  <a href="/tech.html?blogType=3">Mach-E Blog</a> <br><br>
                  <a href="/tech.html?blogType=4">Power-Up Software Updates</a> 
                </div>
            </div>
          </td>
           </td>
        </tr> 
      </table>
        `;
    }

    else if (pageName === "tech" && blogType === "1") {
        nav.innerHTML = `
        <table class="top-nav">
        <tr>
          <td class="nav-td"><a href="/index.html">Home</a> </td>
          <td class="nav-td"><a href="/waxReviews.html?year=1987&pageName=junkWax">90s Hockey Junk Wax</a> </td>
          <td class="nav-td"><a href="/waxReviews.html?year=1979&pageName=classicWax">Classic 80s Hockey Sets</a> </td>
          <td class="nav-td"><a href="/tech.html?blogType=5">Raspberry Pi</a> </td>
          <td class="nav-td">
            <div class="dropdown">
              <span>Mustang Mach-E</span>
                <div class="dropdown-content">
                  <a href="/ev.html?blogType=3">Mach-E Blog</a> <br><br>
                  <a href="/ev.html?blogType=4">Power-Up Software Updates</a> 
                </div>
            </div>
          </td>
        </tr>
      </table>`;
    }

    else if (pageName === "tech" & blogType === "5") {
        nav.innerHTML = `
        <table class="top-nav">
        <tr>
          <td class="nav-td"><a href="/index.html">Home</a> </td>
          <td class="nav-td"><a href="/waxReviews.html?year=1987&pageName=junkWax">90s Hockey Junk Wax</a> </td>
          <td class="nav-td"><a href="/waxReviews.html?year=1979&pageName=classicWax">Classic 80s Hockey Sets</a> </td>
          <td class="nav-td"><a href="/tech.html?blogType=1">Tech Stuff</a> </td>
          <td class="nav-td">
            <div class="dropdown">
              <span>Mustang Mach-E</span>
                <div class="dropdown-content">
                  <a href="/ev.html?blogType=3">Mach-E Blog</a> <br><br>
                  <a href="/ev.html?blogType=4">Power-Up Software Updates</a> 
                </div>
            </div>
          </td>
        </tr>
      </table>`;
    }

    else if (pageName === "ev") {
        nav.innerHTML = `
        <table class="top-nav">
        <tr>
          <td class="nav-td"><a href="/index.html">Home</a> </td>
          <td class="nav-td"><a href="/tech.html?blogType=1">Tech Stuff</a> </td>
          <td class="nav-td"><a href="/tech.html?blogType=5">Raspberry Pi</a> </td>
          <td class="nav-td"><a href="/waxReviews.html?year=1987&pageName=junkWax">90s Hockey Junk Wax</a> </td>
          <td class="nav-td"><a href="/waxReviews.html?year=1979&pageName=classicWax">Classic 80s Hockey Sets</a> </td>
          <td class="nav-td">
            <div class="dropdown">
              <span>Mustang Mach-E</span>
                <div class="dropdown-content">
                  <a href="/ev.html?blogType=3">Mach-E Blog</a> <br><br>
                  <a href="/ev.html?blogType=4">Power-Up Software Updates</a> 
                </div>
            </div>
          </td>
        </tr>
      </table>`;
    }
    
    else if (pageName === "junkWax") {
        nav.innerHTML = `
        <table class="top-nav">
        <tr>
          <td class="nav-td"><a href="/index.html">Home</a> </td>
          <td class="nav-td"><a href="/tech.html?blogType=1">Tech Stuff</a> </td>
          <td class="nav-td"><a href="/tech.html?blogType=5">Raspberry Pi</a> </td>
          <td class="nav-td"><a href="/waxReviews.html?year=1979&pageName=classicWax">Classic 80s Hockey Sets</a> </td>
          <td class="nav-td">
            <div class="dropdown">
              <span>Mustang Mach-E</span>
                <div class="dropdown-content">
                  <a href="/ev.html?blogType=3">Mach-E Blog</a> <br><br>
                  <a href="/ev.html?blogType=4">Power-Up Software Updates</a> 
                </div>
            </div>
          </td>
        </tr>
      </table>`;
    }

    else if (pageName === "classicWax") {
        nav.innerHTML = `
        <table class="top-nav">
        <tr>
          <td class="nav-td"><a href="/index.html">Home</a> </td>
          <td class="nav-td"><a href="/tech.html?blogType=1">Tech Stuff</a> </td>
          <td class="nav-td"><a href="/tech.html?blogType=5">Raspberry Pi</a> </td>
          <td class="nav-td"><a href="/waxReviews.html?year=1987&pageName=junkWax">90s Hockey Junk Wax</a> </td>
          <td class="nav-td">
            <div class="dropdown">
              <span>Mustang Mach-E</span>
                <div class="dropdown-content">
                  <a href="/ev.html?blogType=3">Mach-E Blog</a> <br><br>
                  <a href="/ev.html?blogType=4">Power-Up Software Updates</a> 
                </div>
            </div>
          </td>
        </tr>
      </table>`;
    } 
} // end dynamic Nav
