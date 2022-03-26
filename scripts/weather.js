
/**
 * Logic & Formatting for the Weather Widget
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
        const weatherForcast = document.getElementById("weather");
        weatherForcast.innerHTML = `<p>
                          <strong> Today's ${city} Weather:</strong> <br>
                          Temp: ${temp}&#8451;, Feels Like: ${feelsLike}&#8451;<br>
                          Low: ${minTemp}&#8451;, High: ${maxTemp}&#8451;<br>
                          Wind: ${degreesToRose(windDirection)}, ${wind} km/h <br>
                          Humidity: ${humidity}% <br>
                          &#9788; ${getTime(sunrise)} am, &#9789; ${getTime(sunset)} pm 
                          </p>`;
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
    // Let's make sure the param passed is an Integer...
    const direction = parseInt(degNumber);

    if (direction >= 0 && direction <= 29){
        return 'North';
    }
    else if (direction >= 30 && direction <= 59){
        return 'North East';
    }
    else if (direction >= 60 && direction <= 119){
        return 'East';
    }
    else if (direction >= 120 && direction <= 149){
        return 'South East';
    }
    else if (direction >= 150 && direction <= 209){
        return 'South';
    }
    else if (direction >= 210 && direction <= 239){
        return 'South West';
    }
    else if (direction >= 240 && direction <= 299){
        return 'West';
    }
    else if (direction >= 300 && direction <= 329){
        return 'North West';
    }
    else if (direction >= 330 && direction <= 360){
        return 'North';
    }      
  }

  function convertUnixTime(unixTime) {
    const ms = unixTime * 1000;
    const newTime = new Date(ms);
    return newTime;
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
