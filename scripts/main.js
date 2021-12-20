
/*
AWS Lambda call - createBlogPost
*/

// define the callAPI function that takes the blog title, author and post body as parameters:
function callBlogPostAPI (title,author,postBody){
  // instantiate a headers object
  let myHeaders = new Headers();
  // add content type header to object
  myHeaders.append("Content-Type", "application/json");
  // using built in JSON utility package turn object to string and store in a variable
  let raw = JSON.stringify({"title":title,"author":author,"postBody":postBody});
  // create a JSON object with parameters for API call and store in a variable
  let requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
    };
  
  // make API call to BlogPost endpoint with parameters and use promises to get response
  fetch("https://s4ge5t9w06.execute-api.us-east-2.amazonaws.com/dev ", requestOptions)
  .then(response => response.text())
  .then(result => alert(JSON.parse(result).body))
  .catch(error => console.log('error', error));
  }

  /*
  *  getBlogPosts API call - API exposed via AWS API Gateway
  
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
  } */

  