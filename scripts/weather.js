// Global Variables

const openWeatherUrl = 'https://api.openweathermap.org/data/2.5/weather';

// Get geolocation from the Browser, if available..
if('geolocation' in navigator) {
    /* geolocation is available */
    navigator.geolocation.getCurrentPosition((position) => {
       const lat = position.coords.latitude;
       const long = position.coords.longitude;
        // Our callback to getForcast()
        getForecast(lat,long);
      });
  } else {
    /* geolocation IS NOT available */
  }

  // Geolocation callback...does it work?
  /** 
  function sendGeo(latitude,longitude) {
    const myLat = latitude;
    const myLong = longitude;
    console.log(`sendGeo says... ${myLat} & ${myLong}`);
  } */

  // Possible callback candidate
    function getForecast(latitude,longitude) {
    let myLat = latitude;
    let myLong = longitude;
    const urlToFetch = `${openWeatherUrl}?&lat=${myLat}&lon=${myLong}&units=metric&APPID=${openWeatherKey}`;
    
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