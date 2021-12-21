
/** 
 * This is the main AWS call used to create a NEW BLOG POST
 * AWS Lambda call - createBlogPost
 * Called from the wlcms.html page
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

  /** 
    * This is the main AWS call used to FETCH ALL BLOG POSTS
    * AWS Lambda call - getBlogPost
    * Called from the index.html page
  */

  function fetchAllBlogs() {

   const urlToFetch = `https://kuefte6pgk.execute-api.us-east-2.amazonaws.com/dev`;
      
   fetch(urlToFetch)
       .then(function (response) {
           const jsonResponse = response.json();
           return jsonResponse; // Our Promise object
       })
       .then(function (data) {
       // 'data' is an Object at this point...this is basically the record set returned bt dynamoDB
       // First let's return an array of the object's properties
           const returnedData = Object.entries(data); 
         
       // Next let's just get the 'body' property returned by the Lambda call
          for (const [key, value] of returnedData) {
              if (key === "body"){
               /** 
                * Now that we have the 'body' key, we need to convert the value 
                * (currently a JSON String) to a JSON Object 
                * so that we can pull out the properties of each blog post 
                **/ 
               const blogPostArray = JSON.parse(value);
             
               /** Now that the data we got back is a JSON object, let's loop over all the Posts...
                * The 'Items' property holds an array of all the blog posts 
                * Let's loop through that array and display the fields we want!
                * We created a function to control the display of the blog post
                * data on the page - let's call it once for each blog post
                **/
               for (var i = 0; i < blogPostArray.Items.length; i++) {
                   addBlog(blogPostArray.Items[i].postBody,blogPostArray.Items[i].author,blogPostArray.Items[i].time,blogPostArray.Items[i].ID);
                }
           }
       } 
           
       })
       .catch(function (err) {
           console.log('Something went wrong...: ' + err);
       });
      }

   function addBlog(postBody, author, date, title) {
       // Populate the blogsDiv...
 
       // First, cleanup the JSON double quotes we get back 
       // We parsed the first object we got back, but that didn't parse the contents of the inner properties
       const cleanTitle = JSON.parse(title);
       const cleanAuthor = JSON.parse(author);
       const cleanPostBody = JSON.parse(postBody);

       // Magic Date fixing action...
        function fixDate(date){
            const d = new Date(date);
            const dayNum = d.getDay();
            const weekDay = getDayOfTheWeek(dayNum);
            const monthNum = d.getMonth(); 
            const month = getMonthName(monthNum);
            const year = d.getFullYear(); 
            
            return weekDay + ", " + month + " " + year;
        }
/**
 * Helper function to get the day name, given an Integer value
 * @param {*} day 
 */
        function getDayOfTheWeek(day){

            if (day === 1){
                day = "Monday";
            }
            if (day === 2){
                day = "Tuesday";
            }
            if (day === 3){
                day = "Wednesday";
            }
            if (day === 4){
                day = "Thursday";
            }
            if (day === 5){
                day = "Friday";
            }
            if (day === 6){
                day = "Saturday";
            }
            if (day === 0){
                day = "Sunday";
            }
        }
/**
 * Helper function to get the month name, given an Integer value
 * @param {*} month 
 */
        function getMonthName(month){
            if (day === 0){
                day = "January";
            }
            if (day === 1){
                day = "February";
            }
            if (day === 2){
                day = "March";
            }
            if (day === 3){
                day = "April";
            }
            if (day === 4){
                day = "May";
            }
            if (day === 5){
                day = "June";
            }
            if (day === 6){
                day = "July";
            }
            if (day === 7){
                day = "August";
            }
            if (day === 8){
                day = "September";
            }
            if (day === 9){
                day = "October";
            }
            if (day === 10){
                day = "November";
            }
            if (day === 11){
                day = "December";
            }
        }
 
       // Setup a variable to hold the reference to our Div, 'cause we got work to do!
       var blogBody = document.getElementById("blogsDiv");
       blogBody.innerHTML += "<strong>" + cleanTitle + "</strong> <p> <strong>" + cleanAuthor + " </strong> <p> <strong>" + fixDate(date) + "</strong> <p>" + cleanPostBody + "<br /> <br />"; 
      
   }

   
  