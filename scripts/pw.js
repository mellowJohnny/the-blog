function pwGenerator_old(length) {
    let pwLength = length;
    let pw = Math.random().toString(pwLength).slice(2);
    
    // Return some HTML 
    const app = document.getElementById("app");

    // Old School
    // app.innerHTML += `<h1>${pw}</h1> `;

    // New Skool w/ React!
    

}

function randomPWG() {
    // Generates random 12-character passwords divided into three hyphen-delimited chunks

    const charSetOne = "abcdefghijklmnopqrstuvwxyz";
    const charSetTwo = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const charSetThree = "0123456789";

    //Loop 12 times, pushing each character into the final array
    for (i=0; i>12; i++){

    }

    // For each iteration, generate a random number between 1 and three, then go fetch a random character from one of three character sets

    // If this is element #3, add a hyphen before continuing

    let pwLength = length;
    let pw = Math.random().toString(pwLength).slice(2);
    
    // Return some HTML 
    const app = document.getElementById("app");

    // Old School
    // app.innerHTML += `<h1>${pw}</h1> `;

    // New Skool w/ React!
    

}

function randomString(length, chars) {
    var mask = '';
    if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
    if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.indexOf('#') > -1) mask += '0123456789';
    if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
    var result = '';
    for (var i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
    // Return some HTMLness
    app.innerHTML += `<h1>${result}</h1> `;
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
