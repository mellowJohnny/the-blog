// Global Variables
const openWeatherUrl = 'https://api.openweathermap.org/data/2.5/weather';

// Get geolocation from the Browser, if available..
if('geolocation' in navigator) {
    /* geolocation is available */
    navigator.geolocation.getCurrentPosition((position) => {
       const lat = position.coords.latitude;
       const long = position.coords.longitude;
        // Our callback to getForcast()
        getWeather(lat,long);
      });
  } else {
    /* geolocation IS NOT available */
  }

  // Geolocation callback...
  function getWeather(latitude,longitude) {
    const myLat = latitude;
    const myLong = longitude;
    console.log(`getWeather says... ${myLat} & ${myLong}`);
    fetchForecast;
    
// The Big Lebowski...
    const fetchForecast = async () => {
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
  } 

  