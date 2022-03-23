
// ----------------------------- Create New Blog Post ---------------------------------------

/**
 * This is the main AWS call used to CREATE a NEW BLOG POST
 * Called from the wlcms.html page
 * @param {*} title 
 * @param {*} author 
 * @param {*} postBody 
 */

 function callCreateBlogPostAPI (title,author,postBody,type){
    // instantiate a headers object
    let myHeaders = new Headers();
  
    // add content type header to object
    myHeaders.append("Content-Type", "application/json");
  
    // using built in JSON utility package turn object to string and store in a variable
    let raw = JSON.stringify({"title":title,"author":author,"postBody":postBody,"type":type});
  
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
  
  
  // -------------------------------- Create New Card Post -------------------------------------------------------
  
  /**
   * This is the main AWS call used to CREATE a NEW CARDS POST
   * Called from the wlcms.html page
   * @param {*} setName 
   * @param {*} size
   * @param {*} subsets
   * @param {*} stars
   * @param {*} formats
   * @param {*} year
   * @param {*} postBody 
   * @param {*} mfg 
   */
  
   function callCreateCardSetAPI(setName,size,subsets,stars,formats,year,postBody,mfg){
      // instantiate a headers object
      let myHeaders = new Headers();
    
      // add content type header to object
      myHeaders.append("Content-Type", "application/json");
    
      // using built in JSON utility package turn object to string and store in a variable
      let raw = JSON.stringify({"setName":setName,"size":size,"subsets":subsets,"stars":stars,"formats":formats,"year":year,"postBody":postBody,"mfg":mfg});
    
      // create a JSON object with parameters for API call and store in a variable
      let requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
        };
      
      // make API call to cardPost endpoint with parameters and use promises to get response
      fetch("https://05uss9ffij.execute-api.us-east-2.amazonaws.com/dev", requestOptions)
      .then(response => response.text())
      .then(result => alert(JSON.parse(result).body))
      .catch(error => console.log('error', error));
      }









      
