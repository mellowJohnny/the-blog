// Foursquare API Info
const clientId = 'XSIR0UAH5ZDNPXPSLCWJLZ00Z55BOPIKVIZKBQFLRIDY2BVN';
const clientSecret = 'SQWXOPKY5OLFGNMY4SFRKHXUGA5MVN1SEWRTZ2O5XGM0KRBJ';
const url = 'https://api.foursquare.com/v2/venues/explore?near=';

// OpenWeather Info
const openWeatherKey = '49f84d9cdb7907dfd2b02085e270372e';
const weatherUrl = 'https://api.openweathermap.org/data/2.5/weather';

// Page Elements
const $input = $('#city');
const $submit = $('#button');
const $destination = $('#destination');
const $container = $('.container');
const $venueDivs = [$("#venue1"), $("#venue2"), $("#venue3"), $("#venue4"), $("#venue5", $("#venue6"))];
const $weatherDiv = $("#weather1");
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
    return `<h2>${weekDays[(new Date()).getDay()]}</h2>
          <h2>Temperature: ${currentTemp}&deg;C</h2>
          <h2>Low: ${minTemp}&deg;C</h2>
          <h2>High: ${maxTemp}&deg;C</h2>
          <h2>Condition: ${currentDay.weather[0].description}</h2>
          <h2>Wind Speed: ${currentDay.wind.speed} km/h</h2>
          <h2>Wind Direction: ${degreesToRose(degNumber)} </h2>
          <h2>Visibility: ${currentDay.visibility} km</h2>
        <img src="https://openweathermap.org/img/wn/${currentDay.weather[0].icon}@2x.png">`;
  }
      // Not needed - orginally the services returned temp in Kelvin, but we can also call 
      // it using "&units=metric" to get celsius & km/h etc...
      // const kelvinToFahrenheit = k => ((k - 273.15) * 9 / 5 + 32).toFixed(0);
      // const kelvinToCelsius = k => (k - 273.15).toFixed(0);
  
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
  const urlToFetch = `${weatherUrl}?&q=${$input.val()}&units=metric&APPID=${openWeatherKey}`;
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
const renderVenues = (venues) => {
  $venueDivs.forEach(($venue, index) => {
    // Add your code here:
    const venue = venues[index];
    const venueIcon = venue.categories[0].icon;
    const venueImgSrc = venueIcon.prefix + 'bg_64' + venueIcon.suffix;
    let venueContent = createVenueHTML(venue.name, venue.location, venueImgSrc);
    $venue.append(venueContent);
  });
  $destination.append(`<h2>${venues[0].location.city}</h2>`);
}

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

$submit.click(executeSearch)