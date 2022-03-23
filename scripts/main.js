


// -------------------------------------------------------------------------------------------------


 /** 
    * This is the main AWS call used to FETCH ALL BLOG POSTS
    * AWS Lambda call - getBlogs end-point
    * Called from the index.html page
  */

  function fetchBlogs(blogType) {
      
    // Set up a global variable to hold the API URL
    const urlToFetch = `https://qeb63ean2e.execute-api.us-east-2.amazonaws.com/dev?blogType=${blogType}`;
          

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
                * We call the displayBlog() function to control the display of the blog post
                * It gets called it once for each blog post, essentially populating each blog post one at a time
                **/
         
               for (var i = 0; i < blogPostArray.Items.length; i++) {
                   displayBlog(blogPostArray.Items[i].postBody,
                    blogPostArray.Items[i].author,
                    blogPostArray.Items[i].time,
                    blogPostArray.Items[i].title,
                    blogPostArray.Items[i].img);
                }
           }
       } 
           
       })
       .catch(function (err) {
           console.log('Something went wrong...: ' + err);
       });
      }

// ------------------------------------------------------------------------------------------------------------

/**
 * Function to DISPLAY Blogs dynamically
 * @param {*} postBody 
 * @param {*} author 
 * @param {*} date 
 * @param {*} title 
 * @param {*} img
 */

   function displayBlog(postBody, author, date, title, img) {
       // Populate the blogsDiv...
 
       // Cleanup the JSON we get back so it's back to a String 
       // We parsed the first object we got back, but that didn't parse the contents of the inner properties
       // so we need to explicitly parse title, author, and the blog
       const cleanTitle = JSON.parse(title);
       const cleanAuthor = JSON.parse(author);
       const cleanPostBody = JSON.parse(postBody);
       const cleanImg = JSON.parse(img);

       // Format the Date by passing it to our Magic Date fixer...
       fixDate(date);
        
       // Setup a variable to hold the reference to our Div, 'cause we got work to do!
       let blogBody = document.getElementById("blogsDiv");
       blogBody.innerHTML += 
                    `<p>
                    <h1 class="blog-title">${cleanTitle}</h1> <br>
                    <strong><i>${cleanAuthor} </i></strong><br>
                    <strong><i>${fixDate(date)}</i></strong> <br><br>
                    ${cleanPostBody} 
                    <br>
                    <img src="${cleanImg}" class="blog-img"></img>
                    </p> <hr/> `;
   }


   // ----------------------------- Date Helper Functions ----------------------------

   /**
    * Fixes our Raw Date object coming back from the JSON response
    * @param {*} date 
    * @returns 
    */

   function fixDate(date){
    const d = new Date(date);
    // Get the day of the week as an Interger, then convert it to the name
    const dayNum = d.getDay();
    const weekDay = getDayOfTheWeek(dayNum);

    // Get the month as an Intger, convert it to the name
    const monthNum = d.getMonth(); 
    const month = getMonthName(monthNum);
    // Get the year
    const year = d.getFullYear(); 

    // Gets the day of the month
    const dateNum = d.getDate(); 

    // Smoosh it all together and send it back...
    return weekDay + ", " + month + " " + dateNum + ", " + year;
}

   /**
 * Helper function to get the month name, given an Integer value
 * @param {*} month 
 */
    function getMonthName(monthNum){
        if (monthNum === 0){
            month = "January";
            return month;
        }
        if (monthNum === 1){
            month = "February";
            return month;
        }
        if (monthNum === 2){
            month = "March";
            return month;
        }
        if (monthNum === 3){
            month = "April";
            return month;
        }
        if (monthNum === 4){
            month = "May";
            return month;
        }
        if (monthNum === 5){
            month = "June";
            return month;
        }
        if (monthNum === 6){
            month = "July";
            return month;
        }
        if (monthNum === 7){
            month = "August";
            return month;
        }
        if (monthNum === 8){
            month = "September";
            return month;
        }
        if (monthNum === 9){
            month = "October";
            return month;
        }
        if (monthNum === 10){
            month = "November";
            return month;
        }
        if (monthNum === 11){
            month = "December";
            return month;
        }
    }

/**
 * Helper function to get the day name, given an Integer value
 * @param {*} day 
 */
     function getDayOfTheWeek(dayNum){

        if (dayNum === 1){
            dayName = "Monday";
            return dayName;
        }
        if (dayNum === 2){
            dayName = "Tuesday";
            return dayName;
        }
        if (dayNum === 3){
            dayName = "Wednesday";
            return dayName;
        }
        if (dayNum === 4){
            dayName = "Thursday";
            return dayName;
        }
        if (dayNum === 5){
            dayName = "Friday";
            return dayName;
        }
        if (dayNum === 6){
            dayName = "Saturday";
            return dayName;
        }
        if (dayNum === 0){
            dayName = "Sunday";
            return dayName;
        }
    }
  