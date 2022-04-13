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
    let pw = "";

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


//// NEXT!
function createPassword(){
    const pw = generatePassword()
    // Return some HTMLness
    app.innerHTML += `<h1>${result}</h1> `;
    }

var generatePassword = (
    length = 20,
    wishlist = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
  ) =>
    Array.from(crypto.getRandomValues(new Uint32Array(length)))
      .map((x) => wishlist[x % wishlist.length])
      .join('')



