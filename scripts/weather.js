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
        // Our callback to getForcast()
        getWeather(lat,long);
      });
  } else {
    /* geolocation IS NOT available */
  }

  // Geolocation callback...
  async function getWeather(latitude,longitude) {
    const myLat = latitude;
    const myLong = longitude;
    const urlToFetch = `${openWeatherUrl}?&lat=${myLat}&lon=${myLong}&units=metric&APPID=${openWeatherKey}`;
    console.log(`getWeather says... ${myLat} & ${myLong}`)

    // Now that we have the latitude & longitude, let's get the weather forecast
    try {
      const response = await fetch(urlToFetch);
      if (response.ok){
        const jsonResponse = await response.json();
        // Parse it just so we can colsole.log it
        const forecast = JSON.parse(jsonResponse);
        console.log(`Here is the forcast... ${forecast}`);
        return jsonResponse;
      }
    }
    catch(error){
      console.log(error);
    }
  } 

  const fetchForecast = async () => {
    const urlToFetch = `${weatherUrl}?&lat=${myLat}&lon=${myLong}&units=metric&APPID=${openWeatherKey}`;
    
    try {
      const response = await fetch(urlToFetch);
      if (response.ok){
        const jsonResponse = await response.json();
        console.log(`Here is the forcast... ${jsonResponse}`);
        return jsonResponse;
      }
    }
    catch(error){
      console.log(error);
    }
  }
  