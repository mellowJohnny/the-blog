const $blogsDiv = $("#blogs"); 

const renderBlogs = (blogs) => {
    const blogContent = createBlogsHTML(blogs);
    $blogsDiv.append(blogContent);
  };

const executeSearch = () => {
    $blogsDiv.empty();
    getBlogs().then(blogs => renderBlogs(blogs));
    return false;
  }
  

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


  const createBlogsHTML = (blogs) => {
    // Loop over the Blogs and spit out the Title, Author, and Body of each...
    let blogString = "";    
    for (i=0; i < blogs.length; i++) {
            for (j=0; j < blogs[i]; j++){
                console.log(blogs[j]);
            }
        }
    
      // This creates and returns the formatted data...
    return `
            Temperature: ${currentTemp}&deg;C
            <br>
            Low: ${minTemp}&deg;C
            <br>
            High: ${maxTemp}&deg;C
            <br>
            Conditions: ${currentDay.weather[0].description}
            <br>
            Wind Speed: ${Math.round(currentDay.wind.speed)} km/h
            <br>
            Wind Direction: ${degreesToRose(degNumber)}
            <br>
            Visibility: ${currentDay.visibility} km`;
  }
  