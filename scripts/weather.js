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

        // Stringify the response just in case we ever want to print the whole thing
        const stringVersion = JSON.stringify(jsonResponse);

        // Step 1: Now that jsonResponse is our JSON forcast let's get the values we want to display
        const city = jsonResponse.name;
        const temp = jsonResponse.main.temp;
        const humidity = jsonResponse.main.humidity;
        const feelsLike = jsonResponse.main.feels_like;
        const wind = jsonResponse.wind.speed;
        const windDirection = jsonResponse.deg;
        console.log(`The current temp is ${temp} degrees, feels like ${feelsLike}`);

        // Step 2: Now that we have all the fields we want, let's populate the HTML DIV
        const weatherForcast = document.getElementById("weather");
        weatherForcast.innerHTML = `
                          The Current Temprature for ${city} is ${temp} <br> 
                          Feels Like: ${feelsLike} <br>
                          Wind: ${wind} km/h from the ${degreesToRose(windDirection)} <br>
                          Humidity: ${humidity} <br>
                          `;
      }
    }
    catch(error){
      console.log(error);
    }
  } 

  /**
   * Since the Weather response does not use compass rose directions, let's do it ourselves!
   * @param {*} degNumber 
   * @returns 
   */
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


  /**
   * For Reference, here is an example JSON Weather response
   * 
   * {
   * "coord":
   *    {"lon":-79.6863,"lat":43.4702},
   * "weather":
   *    [{"id":804,"main":"Clouds","description":"overcast clouds","icon":"04d"}],
   * "base":"stations",
   * "main":
   *    {
   *      "temp":3.8,
   *      "feels_like":2.81,
   *      "temp_min":2.63,
   *      "temp_max":4.35,
   *      "pressure":1008,
   *      "humidity":71
   *    },
   * "visibility":10000,
   * "wind":
   *        {
   *         "speed":1.34,
   *         "deg":240,
   *         "gust":5.36
   *         },
   * "clouds":
   *        {
   *         "all":100
   *          },
   * "dt":1640032100,
   * "sys":
   *       {
   *        "type":2,
   *        "id":2010070,
   *        "country":"CA",
   *        "sunrise":1640004485,
   *        "sunset":1640036693
   *         },
   * "timezone":-18000,
   * "id":6092122,
   * "name":"Oakville",
   * "cod":200
   * }
   */
