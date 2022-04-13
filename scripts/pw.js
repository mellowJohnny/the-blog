function pwGenerator(length) {
    let pwLength = length;
    let pw = Math.random().toString(pwLength).slice(2);
    
    // Return some HTML 
    let pwDiv = document.getElementById("pwDiv");
    pwDiv.innerHTML += `<h1>${pw}</h1> `;
}
