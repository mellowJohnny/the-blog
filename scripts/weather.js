if('geolocation' in navigator) {
    /* geolocation is available */
    navigator.geolocation.getCurrentPosition((position) => {
        sendGeo(position.coords.latitude, position.coords.longitude);
        console.log(position.coords.latitude,position.coords.longitude)
      });
  } else {
    /* geolocation IS NOT available */
  }