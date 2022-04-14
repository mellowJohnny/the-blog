


//// NEXT!
function createPassword(){
    const pw = generatePassword()
    // Return some HTMLness
    app.innerHTML += `<h1>${pw}</h1> `;
    }

var generatePassword = (
    length = 20,
    wishlist = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
  ) =>
    Array.from(crypto.getRandomValues(new Uint32Array(length)))
      .map((x) => wishlist[x % wishlist.length])
      .join('')



