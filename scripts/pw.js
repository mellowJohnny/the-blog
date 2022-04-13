function pwGenerator_old(length) {
    let pwLength = length;
    let pw = Math.random().toString(pwLength).slice(2);
    
    // Return some HTML 
    let pwDiv = document.getElementById("pwDiv");
    pwDiv.innerHTML += `<h1>${pw}</h1> `;
}

function pwGenerator(length) {
    let pw  = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	
   // Loop "length" number of times, rndomly picking a character from the array
    for ( var i = 0; i < length; i++ ) {
      pw += characters.charAt(Math.floor(Math.random() * 58)); //58 is the number of letters / numbers array
   }
   
   // Return some HTML 
    let pwDiv = document.getElementById("pwDiv");
    pwDiv.innerHTML += `<h1>${pw}</h1> `;

}
