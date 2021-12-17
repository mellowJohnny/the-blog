/* Global Variables...*/

// Foursquare API Info
const clientId = 'XSIR0UAH5ZDNPXPSLCWJLZ00Z55BOPIKVIZKBQFLRIDY2BVN';
const clientSecret = 'SQWXOPKY5OLFGNMY4SFRKHXUGA5MVN1SEWRTZ2O5XGM0KRBJ';
const url = 'https://api.foursquare.com/v2/venues/explore?near=';

// OpenWeather Info
const openWeatherKey = '49f84d9cdb7907dfd2b02085e270372e';
const weatherUrl = 'https://api.openweathermap.org/data/2.5/weather';

// Hold the latitude & longitude set by the geoFindMe() function
// These get passed in dynamically to the getForecast() function
let myLat = 0;
let myLong = 0;

// Page Elements
const $input = $('#city');
const $submit = $('#button');
const $destination = $('#destination');
const $container = $('.container');
const $venueDivs = [$("#venue1"), $("#venue2"), $("#venue3"), $("#venue4"), $("#venue5", $("#venue6"))];
const $weatherDiv = $("#weather1"); // This is the connection to the HTML page Div ID on line 73
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Geolocation
function geoFindMe() {

  // const status = document.querySelector('#status');
  // const mapLink = document.querySelector('#map-link');
  
 // mapLink.href = '';
 // mapLink.textContent = '';
  
  function success(position) {
    const latitude  = position.coords.latitude;
    const longitude = position.coords.longitude;
    // Shave a few decimals off for display purposes...
    myLat = latitude.toFixed(2);
    myLong = longitude.toFixed(2);
  
    status.textContent = '';
   // mapLink.href = `https://www.openstreetmap.org/#map=18/${latitude}/${longitude}`;
   // mapLink.textContent = `Latitude: ${myLat} °, Longitude: ${myLong} °`;
    executeSearch();
  }
  
  function error() {
    status.textContent = 'Unable to retrieve your location';
  }
  
  if(!navigator.geolocation) {
    status.textContent = 'Geolocation is not supported by your browser';
  } else {
    status.textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(success, error);
  }
  
  }
  

// -------------------------------- Helper Functions... -----------------------------
const createVenueHTML = (name, location, iconSource) => {
    return `<h2>${name}</h2>
    <img class="venueimage" src="${iconSource}"/>
    <h3>Address:</h3>
    <p>${location.address}</p>
    <p>${location.city}</p>
    <p>${location.country}</p>`;
  }
  
  
  const createWeatherHTML = (currentDay) => {
    // Set up some temprature variables we need...rounding them to a single digit
    const currentTemp = (currentDay.main.temp).toFixed(0);
    const minTemp = (currentDay.main.temp_min).toFixed(0);
    const maxTemp = (currentDay.main.temp_max).toFixed(0);
    const cityName = currentDay.name;

    // Function to convert wind direction from degrees to a compass point:
    // JSON returns a String for wind direction, need to convert it to Number, then compare it,
    // returning a String representing the name of the compass heading
    const degNumber = parseInt(currentDay.wind.deg);
    const degreesToRose =  degNumber => {
        if (degNumber >= 0 && degNumber <= 29){
            return 'North';
        }
        else if (degNumber >= 30 && degNumber <= 59){
            return 'North East';
        }
        else if (degNumber >= 60 && degNumber <= 119){
            return 'East';
        }
        else if (degNumber >= 120 && degNumber <= 149){
            return 'South East';
        }
        else if (degNumber >= 150 && degNumber <= 209){
            return 'South';
        }
        else if (degNumber >= 210 && degNumber <= 239){
            return 'South West';
        }
        else if (degNumber >= 240 && degNumber <= 299){
            return 'West';
        }
        else if (degNumber >= 300 && degNumber <= 329){
            return 'North West';
        }
        else if (degNumber >= 330 && degNumber <= 360){
            return 'North';
        }      
      };
      // This creates and returns the formatted data...
    return `
          <table border='0'>
            <tr span='6'>
              <td colspan='6'><strong>${weekDays[(new Date()).getDay()]} in ${cityName}:</strong></td>
            </tr>
            <tr>
              <td>
                <img src="https://openweathermap.org/img/wn/${currentDay.weather[0].icon}.png"> &nbsp 
              </td>
              <td>
                Current Temperature: ${currentTemp}&deg;C &nbsp
                Low: ${minTemp}&deg;C &nbsp 
                High: ${maxTemp}&deg;C &nbsp <br>
                Conditions: ${currentDay.weather[0].description}, wind ${Math.round(currentDay.wind.speed)} km/h from the ${degreesToRose(degNumber)},
                visibility ${currentDay.visibility}km 
              </td>
            </tr>
          </table> `;
  }
  
  // ------------------------------------------ End Helper Functions -------------------------

// Add AJAX functions here:
const getVenues = async () => {
  const city = $input.val();
  const urlToFetch = url + city + '&limit=10' + '&client_id=' + clientId + '&client_secret=' + clientSecret + '&v=20201125';
  try {
    const response = await fetch(urlToFetch);
    if (response.ok){
      const jsonResponse = await response.json();
      const venues = jsonResponse.response.groups[0].items.map(item => item.venue);
      console.log(venues);
    return venues;
    }
  }
  catch(error) {
    console.log(error);
  }
}

const getForecast = async () => {
  // Dynamically pass in the latitude & longitude fetched from geoFindMe()
  const urlToFetch = `${weatherUrl}?&lat=${myLat}&lon=${myLong}&units=metric&APPID=${openWeatherKey}`;
  
  try {
    const response = await fetch(urlToFetch);
    if (response.ok){
      const jsonResponse = await response.json();
      console.log(jsonResponse);
      return jsonResponse;
    }
  }
  catch(error){
    console.log(error);
  }
}


// Render functions
/** const renderVenues = (venues) => {
  $venueDivs.forEach(($venue, index) => {
    // Add your code here:
    const venue = venues[index];
    const venueIcon = venue.categories[0].icon;
    const venueImgSrc = venueIcon.prefix + 'bg_64' + venueIcon.suffix;
    let venueContent = createVenueHTML(venue.name, venue.location, venueImgSrc);
    $venue.append(venueContent);
  });
  $destination.append(`<h2>${venues[0].location.city}</h2>`);
} **/

const renderForecast = (day) => {
  const weatherContent = createWeatherHTML(day);
  $weatherDiv.append(weatherContent);
};


const executeSearch = () => {
  $venueDivs.forEach(venue => venue.empty());
  $weatherDiv.empty();
  $destination.empty();
  $container.css("visibility", "visible");
  getVenues().then(venues => renderVenues(venues)
    );
  getForecast().then(forecast => renderForecast(forecast));
  return false;
}

// $submit.click(executeSearch)

/*
AWS Lambda call - createBlogPost
*/

// define the callAPI function that takes the blog title, author and post body as parameters:
function callBlogPostAPI (title,author,postBody){
  // instantiate a headers object
  let myHeaders = new Headers();
  // add content type header to object
  myHeaders.append("Content-Type", "application/json");
  // using built in JSON utility package turn object to string and store in a variable
  let raw = JSON.stringify({"title":title,"author":author,"postBody":postBody});
  // create a JSON object with parameters for API call and store in a variable
  let requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
    };
  
  // make API call to BlogPost endpoint with parameters and use promises to get response
  fetch("https://s4ge5t9w06.execute-api.us-east-2.amazonaws.com/dev ", requestOptions)
  .then(response => response.text())
  .then(result => alert(JSON.parse(result).body))
  .catch(error => console.log('error', error));
  }

  /*
  *  getBlogPosts API call - API exposed via AWS API Gateway
  */
  const getBlogs = async () => {
    // Dynamically pass in the latitude & longitude fetched from geoFindMe()
    const urlToFetch = `https://kuefte6pgk.execute-api.us-east-2.amazonaws.com/dev`;
    
    try {
      const response = await fetch(urlToFetch);
      if (response.ok){
        const jsonResponse = await response.json();
        console.log(jsonResponse);
        return jsonResponse;
      }
    }
    catch(error){
      console.log(error);
    }
  }

  