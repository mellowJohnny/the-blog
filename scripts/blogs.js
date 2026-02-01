// BLOG Pagination Global Variables
var globalPageName = "";
let allBlogs = []; // Used in pagination - holds all the Blogs so we can paginate through it
let currentBlogPage = 1; // Which Blog to start with
const blogPageSize = 1; // how many blogs to display at a time


/************************** fetchBlogs() Function, also orders the results via getSortOrder ****************/

 /** 
    * This function calls an underlying AWS call used to FETCH ALL BLOG POSTS
    * AWS Lambda call - getBlogs end-point
    * Called from the index.html page
  */

  function fetchBlogs(blogType) {
  fetch(`https://qeb63ean2e.execute-api.us-east-2.amazonaws.com/dev?blogType=${blogType}`)
    .then(res => res.json())
    .then(blogArray => {

      if (!Array.isArray(blogArray)) {
        throw new Error("API did not return an array");
      }

      // Sort blogs
      if (blogType === "5") {
        blogArray.sort(getSortOrder("time", "last"));   // Most recent last. Function lives in helper.js
      } else {
        blogArray.sort(getSortOrder("time", "first"));  // Most recent first. Function lives in helper.js
      }

      // Store full dataset for pagination
      allBlogs = blogArray;
      currentBlogPage = 1;

      renderBlogPage();
    })
    .catch(err => console.error("FETCH ERROR:", err));
}


/** 
 * Pagination Renderer
 * This is where we call displayBlog
 */

function renderBlogPage() {
  const blogDiv = document.getElementById("blogsDiv");
  blogDiv.innerHTML = "";

  const start = (currentBlogPage - 1) * blogPageSize;
  const end = start + blogPageSize;
  const pageItems = allBlogs.slice(start, end);

  pageItems.forEach(blog => {
    displayBlog(
      blog.postBody,
      blog.author,
      blog.time,
      blog.title,
      blog.img,
      blog.imgCap
    );
  });

  renderBlogPaginationControls(start, end);
}

// ****************************************** displayBlog Function *****************************

/**
 * Function to FORMAT & DISPLAY Blogs posts
 * NOTE! We now use onerror image handling so any blog with broken images fail gracefully
 * @param {*} postBody 
 * @param {*} author 
 * @param {*} date 
 * @param {*} title 
 * @param {*} img
 * @param {*} imgCap
 */

   function displayBlog(postBody, author, date, title, img, imgCap) {
  const cleanTitle = title;
  const cleanAuthor = author;
  const cleanPostBody = postBody;
  const cleanImg = img;
  const cleanImgCap = imgCap;

  const blogBody = document.getElementById("blogsDiv");
    
  // Let's estimate how long it will take to read this Blog based on its length. 
  // This function lives in hepler.js
  const readingStats = estimateReadingTime(cleanPostBody); // Lives in helper.js


  // If no image was provided at all. NOTE: fixDate() lives in helper.js
  if (cleanImg === "none") {
    blogBody.innerHTML += 
      `<h1 class="blog-title">${cleanTitle}</h1> 
       <strong><i>${cleanAuthor}</i></strong><br>
       <strong><i>${fixDate(date)}</i></strong> 
       <strong><i>${readingStats.minutes} minute read</i></strong><br>
       ${cleanPostBody}
       <hr/><br>`;
    return;
  }

  // Otherwise include the image with an onerror handler
  blogBody.innerHTML += 
    `<h1 class="blog-title">${cleanTitle}</h1> 
     <strong><i>${cleanAuthor}</i></strong><br>
     <strong><i>${fixDate(date)}</i></strong><br>
     <strong><i>${readingStats.minutes} minute read</i></strong><br>
     ${cleanPostBody}
     <img src="${cleanImg}" class="blog-img"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='none';">
     <br>
     <i>${cleanImgCap}</i>
     <hr/><br>`;
}


/**
 * Blog-specific pagination controls
 */

function renderBlogPaginationControls(start, end) {
  const controls = document.getElementById("paginationControls");
  controls.innerHTML = "";

  const prevBlog = allBlogs[start - 1];
  const nextBlog = allBlogs[end];

  const prevLabel = prevBlog ? `← ${prevBlog.title}` : "← Previous";
  const nextLabel = nextBlog ? `${nextBlog.title} →` : "Next →";

  const totalPages = Math.ceil(allBlogs.length / blogPageSize);

  controls.innerHTML = `
    <a onclick="prevBlogPage()" class="pagination-link ${currentBlogPage === 1 ? "disabled" : ""}">
      ${prevLabel}
    </a>

    <span class="pagination-page">Page ${currentBlogPage} of ${totalPages}</span>

    <a onclick="nextBlogPage()" class="pagination-link ${currentBlogPage === totalPages ? "disabled" : ""}">
      ${nextLabel}
    </a>
  `;
}

/**
 * Blog-specifc Next & Previous controls
 */

function nextBlogPage() {
  const totalPages = Math.ceil(allBlogs.length / blogPageSize);
  if (currentBlogPage < totalPages) {
    currentBlogPage++;
    renderBlogPage();
    document.getElementById("blog-intro").scrollIntoView({ behavior: "smooth" }); // was getElementbyId(blogTop)
  }
}

function prevBlogPage() {
  if (currentBlogPage > 1) {
    currentBlogPage--;
    renderBlogPage();
    document.getElementById("blog-intro").scrollIntoView({ behavior: "smooth" });
  }
}


/*********************************************** fetchBlogIntroByType *************************************/

 /** 
    * This function calls an underlying AWS call used to FETCH blogs intros given a specific blogType
    * AWS API Gateway API call - getBlogIntro end-point (& getBlogIntro Lambda)
  */

 function fetchBlogIntroByType(blogType) {

   // console.log("In fetchBlog...");
   // console.log(`blogType is: ${blogType}`);

    const urlToFetch = `https://0t14dphgwb.execute-api.us-east-2.amazonaws.com/dev?blogType=${blogType}`;

    fetch(urlToFetch)
        .then(response => response.json())
        .then(data => {
          //  console.log("API returned:", data);

            // DynamoDB returns an object with an Items array
            if (!data.Items || data.Items.length === 0) {
                document.getElementById("blog-intro").innerHTML =
                    "...this blog needs no introduction!!";
                return;
            }

            // Extract the intro text from the first item
            const intro = data.Items[0].introText;

            // Display it
            document.getElementById("blog-intro").innerHTML = intro;
        })
        .catch(err => {
            console.log("Something went wrong:", err);
            document.getElementById("blog-intro").innerHTML =
                "...Ah, Houston, we've had a problem...";
        });
}



/**
 * Logic & Formatting for the Weather Widget
 * NEW: Tries to read the location cookie first, and sets one if it does not exist
 */

// Global Variables
const openWeatherUrl = 'https://api.openweathermap.org/data/2.5/weather';
const openWeatherKey = '49f84d9cdb7907dfd2b02085e270372e';
let lat = "";
let long = "";

// Get geolocation from the Browser, if available..
if('geolocation' in navigator) {


    /* geolocation is available */
    navigator.geolocation.getCurrentPosition((position) => {
       lat = position.coords.latitude;
       long = position.coords.longitude;
        // We got some coordinates, let's make a callback to getWeather()!

        getWeather(lat,long);
      });
  } else {
    /* geolocation IS NOT available */
    navigator.geolocation.getCurrentPosition(pos => console.log("Position OK", pos), err => console.error("Geolocation error:", err)
);

    document.getElementById("weather").innerHTML = "<p>Current location unavilable...</p>";
  }

  // This is our Geolocation callback...we call it asynchronously becasue we don't want tit o block page load
  async function getWeather(latitude,longitude) {

    // Our Latitude & Longitude constants, passed to us 
    const myLat = latitude;
    const myLong = longitude;

    // Go fetch the weather forcast based on the Lat & Long the browser gave us
    // Note: we specifically fetch in Metric
    const urlToFetch = `${openWeatherUrl}?&lat=${myLat}&lon=${myLong}&units=metric&APPID=${openWeatherKey}`;

    // Now that we have the latitude & longitude, let's get the weather forecast
    try {
      const response = await fetch(urlToFetch);
      if (response.ok){

        // This is our JSON Object containing the weather forecast
        const jsonResponse = await response.json();

        // Stringify the response just in case we ever want to print the whole thing
        // const stringVersion = JSON.stringify(jsonResponse);

        // Step 1: Now that jsonResponse is our JSON forcast let's get the values we want to display
        const city = jsonResponse.name;

        // Let's round the temp values to one decimal
        const t = jsonResponse.main.temp;
        const temp = t.toFixed();
        const fL = jsonResponse.main.feels_like;
        const feelsLike = fL.toFixed();
        const mnT = jsonResponse.main.temp_min;
        const minTemp = mnT.toFixed();
        const mxT = jsonResponse.main.temp_max;
        const maxTemp = mxT.toFixed();
        const humidity = jsonResponse.main.humidity;
        

        // Wind speed is returned as m/s - multiply by 3.6 to get Km/h
        const windMpS  = jsonResponse.wind.speed; 
        const wind = (windMpS * 3.6).toFixed();
        const windDirection = jsonResponse.wind.deg;
        

        // Sunrise & Sunset comes as a Unix timestamp...convert it
        // Once converted we can then run it through our magic getTime() formatter :-)
        // We do this as we send the content to the .innerHTML of the DIV
        const rise = jsonResponse.sys.sunrise;
        const sunrise = convertUnixTime(rise);
        const set = jsonResponse.sys.sunset;
        const sunset = convertUnixTime(set);

        // Magic Date fixing action...also return Hours in 12 hr format...
        function getTime(date){
          const d = new Date(date);
          let hour = d.getHours(); // comes in 24h time format
          const min = d.getMinutes(); 
          // Call the padLeft() function to fix the weird missing 0 problem
          const minutes = padLeft(min,'0',2); 

          // Convert to 12h time if needed...
          if (hour >= 13) {
            hour = hour - 12; 
          }

          return hour + ":" + minutes;
        }

        // Add the trailing 0 to time so '3:1 pm' is '3:01 pm'
        function padLeft(string,pad,length) {
          return (new Array(length+1).join(pad)+string).slice(-length);
        }

        // Step 2: Now that we have all the fields we want, let's populate the HTML DIV
        // TWO VERSIONS - one for desktop and one for mobile, determined by the CSS
        const weatherForcast = document.getElementById("weather");
        weatherForcast.innerHTML = `
          <p class="weather-full">
            <strong>Today's ${city} Weather:</strong><br>
            Temp: ${temp}°C, Feels Like: ${feelsLike}°C<br>
            Low: ${minTemp}°C, High: ${maxTemp}°C<br>
            Wind: ${wind} km/h ${degreesToRose(windDirection)}<br>
            Humidity: ${humidity}%<br>
            ☀ ${getTime(sunrise)} am, 🌙 ${getTime(sunset)} pm
          </p>

          <p class="weather-condensed">
            <strong>${city}:</strong><br>
            ${temp}°C <br>
            ${wind} km/h ${degreesToRose(windDirection)}<br>
            🌙 ${getTime(sunset)}
          </p>`;

      }
    }
    catch(error){
      console.log(error);
      const errorMsg = document.getElementById("weather");
        errorMsg.innerHTML = `<p>Unable to fetch weather...</p>`;
    }
  } 

  /**
   * Since the Weather response does not use compass rose directions, let's do it ourselves!
   * @param {*} degNumber 
   * @returns 
   */
  const degreesToRose =  degNumber => {
    // Let's make sure the param passed is an Integer...
    const direction = parseInt(degNumber);

    if (direction >= 0 && direction <= 29){
        return 'N';
    }
    else if (direction >= 30 && direction <= 59){
        return 'NE';
    }
    else if (direction >= 60 && direction <= 119){
        return 'E';
    }
    else if (direction >= 120 && direction <= 149){
        return 'SE';
    }
    else if (direction >= 150 && direction <= 209){
        return 'S';
    }
    else if (direction >= 210 && direction <= 239){
        return 'SW';
    }
    else if (direction >= 240 && direction <= 299){
        return 'W';
    }
    else if (direction >= 300 && direction <= 329){
        return 'NW';
    }
    else if (direction >= 330 && direction <= 360){
        return 'N';
    }      
  }

  function convertUnixTime(unixTime) {
    const ms = unixTime * 1000;
    const newTime = new Date(ms);
    return newTime;
  }





  
