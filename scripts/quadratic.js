/*
Let's solve the Quadratic Equation
*/


function quadSolver(input1,input2,input3) {

    // Set some variables
    const a = input1;
    const b = input2;
    const c = input3;
    var root1 = 0;
    var root2 = 0;
    
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
    
    console.log(`Given A = ${a}, B = ${b}, C = ${c}:`)
    console.log(`Root 1 is ${root1}`)
    console.log(`Root 2 is ${root2}`)

}

quadSolver(2,5,3);
