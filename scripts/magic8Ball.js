// Magic Eight Ball
let userName = 'Christian';
let userQuestion = 'Will you buy a Porsche?';
let randomNumber;
let eightBall = '';

// Check for a userName...
userName ? console.log("Hello " + userName) : console.log("Hello Nobody");

// State the question...
console.log(userQuestion);

// Generate a random number between 1 and 8
// Then switch on the value...
randomNumber = Math.floor((Math.random() * 8));
// console.log(randomNumber);
eightBall = randomNumber;

switch (eightBall) {
  case 0 : console.log('It is Certain'); break;
  case 1 : console.log('It is decidedly so'); break;
  case 2 : console.log('Reply hazy...try again'); break;
  case 3 : console.log('Cannot predict now'); break;
  case 4 : console.log('Do not count on it'); break;
  case 5 : console.log('My sources say...No'); break;
  case 6 : console.log('Outlook not so good'); break;
  case 7 : console.log('Signs point to yes'); break;
  default: console.log("Error"); break;
}