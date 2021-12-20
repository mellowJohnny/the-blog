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

        // Stringify the response just in case we want to print the whole thing
        const stringVersion = JSON.stringify(jsonResponse);

        // Step 1: Now that jsonResponse is our JSON forcast let's get the values we want to display
        const temp = jsonResponse.main.temp;
        // const feelsLike = jsonResponse.main.feels_like;
        console.log(`The current temp is ${temp} degrees`);
        // return jsonResponse;

        const weatherForcast = document.getElementById("weather");
        weatherForcast.innerHTML = "The Current Temprature is " + temp + "<br>" + stringVersion;
      }
    }
    catch(error){
      console.log(error);
    }
  } 
