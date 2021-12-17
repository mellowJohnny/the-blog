if('geolocation' in navigator) {
    /* geolocation is available */
    navigator.geolocation.getCurrentPosition((position) => {
       const lat = position.coords.latitude;
       const long = position.coords.longitude;
       console.log(`Latitude is ${lat}, Longitude is ${long}`);
        sendGeo(lat,long);
      });
  } else {
    /* geolocation IS NOT available */
  }

  function sendGeo(latitude,longitude) {
    const myLat = latitude;
    const myLong = longitude;
    console.log(`sendGeo says... ${myLat} & ${myLong}`);
  }