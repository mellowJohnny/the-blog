/*
Let's solve the Quadratic Equation
*/


function quadSolver(input1,input2,input3) {

    // Set some variables & convert our String input numbers to Integers
    const a = input1;
    const b = input2;
    const c = input3;

    const numOne = parseInt(a);
    const numTwo = parseInt(b);
    const numThree = parseInt(c);

    var root1 = 0;
    var root2 = 0;

    console.log(`Numbers are A = ${numOne}, B = ${numTwo}, C = ${numThree}:`);
    

   // Next, make sure all numbers are numbers...
   // First Number must be positive...

   if (isNaN(numOne) || numOne > 0){
    console.log("not a number!")
    swal({
      title: "Your First Value Must Be A Negative Number",
      text: `Don't get me started on why, but the square of a neagtive really messes things up...`,
      icon: "warning",
      button: "I'll Play Nice",
      className: "modal",
    });
    return;
  }

   if (isNaN(numOne)){
    console.log("not a number!")
    swal({
      title: "Your First Value Is Not A Number",
      text: `This won't work if you don't play by the rules...`,
      icon: "warning",
      button: "I'll Play Nice",
      className: "modal",
    });
    return;
  }

  if (isNaN(numTwo)){
    console.log("not a number!")
    swal({
      title: "Your Second Value Is Not A Number",
      text: `This won't work if you don't play by the rules...`,
      icon: "warning",
      button: "I'll Play Nice",
      className: "modal",
    });
    return;
  }

  if (isNaN(numThree)){
    console.log("not a number!")
    swal({
      title: "Your Third Value Is Not A Number",
      text: `This won't work if you don't play by the rules...`,
      icon: "warning",
      button: "I'll Play Nice",
      className: "modal",
    });
    return;
  }
    
    // Solve for root1
    root1 = (numTwo * numTwo) - (4 * numOne * numThree);
    root1 = Math.sqrt(root1); // This *must* be a positive number - calling Math.sqrt on a negative returns NaN
    root1 = (-numTwo) + root1;
    root1 = (root1) / (2 * numOne)
    root1 = Math.round(root1 * 1000) / 1000
    
    // Solve for root2
    root2 = (numTwo * numTwo) - (4 * numOne * numThree)
    root2 = Math.sqrt(root2); // This *must* be a positive number - calling Math.sqrt on a negative returns NaN
    root2 = (-numTwo) - root2
    root2 = (root2) / (2 * numOne)
    root2 = Math.round(root2 * 1000) / 1000
    
    swal({
        title: "Nice!",
        text: `Root 1 is: ${root1}, Root 2 is:${root2}`,
        icon: "success",
        button: "Math is Fun!  Let's try again!",
        className: "modal",
      });


}


