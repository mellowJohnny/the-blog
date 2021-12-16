/*
Let's solve the Quadratic Equation
*/


function quadSolver(input1,input2,input3) {

    // Set some variables & convert our String input numbers to Integers
    const a = parseInt(input1);
    const b = parseInt(input2);
    const c = parseInt(input3);
    var root1 = 0;
    var root2 = 0;

    console.log(`Numbers are A = ${a}, B = ${b}, C = ${c}:`);
    

   // Next, make sure all numbers are numbers...

   if (isNaN(a) || a === 0){
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

  if (isNaN(b) || b === 0){
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

  if (isNaN(c) || c === 0){
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
    root1 = (b * b) - (4 * a * c);
    root1 = Math.sqrt(root1);
    root1 = (-b) + root1;
    root1 = (root1) / (2 * a)
    
    // Solve for root2
    root2 = (b * b) - (4 * a * c)
    root2 = Math.sqrt(root2);
    root2 = (-b) - root2
    root2 = (root2) / (2 * a)
    
    swal({
        title: "Nice!",
        text: `Root 1 is: ${root1}, Root 2 is:${root2}`,
        icon: "success",
        button: "Math is Fun!  Let's try again!",
        className: "modal",
      });


}


