/* This Function calculates the page slot a card will occupy, from 1 to 9, on a standard 9 slot trading card page */
function computeGridSpace(card) {

    // Variables
    let cardSlot = 0;

    // Convert our String card number to an Integer
    cardNum = parseInt(card);

   if (isNaN(cardNum) || cardNum === 0){
      console.log("not a number!")
      swal({
        title: "Please Enter A Number",
        text: `This won't work if you don't play by the rules...`,
        icon: "warning",
        button: "I'll Play Nice",
        className: "modal",
      });
      return;
    }
    
    // Step 1: Determine the slot a given card will occupy on a nine pocket card page
    // by returning the modulus of the card number.  We always use 9 as it is assumed we have 9 pockets per page
    cardSlot = (cardNum % 9);

    // Because of the way modulus works, all card numbers divisible by 9 will return 0 i.e. no remainder
    // For example, card number 9, 18, 27 etc - they all accupy the 9th slot, but modulus returns 0...
    // So...we need to set the cardSlot manually to 9 when we have a 0 returned
    if (cardSlot === 0){
        cardSlot = 9;
    }

    // Step 2: Calculate the page number the card will be on by
    // If the result is not an Integer, we fix it later
    const page = cardNum / 9;

    /*  Display the results */
    if (!Number.isInteger(page)) {
      // If we are here the page number is not an integer, so trim the decimal places
      // We then need to increment the page number as any fraction of a page needs to be rounded up to the next whole page number
      let nextPage = parseInt(page);
      nextPage++;
      
      // After fixing the page number, use SweetAlert to pop a modal with the Card Slot & Page Number
      swal({
        title: "Nice!",
        text: `Card ${cardNum} goes in slot ${cardSlot} on page ${nextPage}`,
        icon: "success",
        button: "Next Card",
        className: "modal",
      });
      
    }
    else {
    // Page number is an Integer, use SweetAlert to pop a modal with the Card Slot & Page Number
      swal({
        title: "Nice!",
        text: `Card ${cardNum} goes in Slot ${cardSlot} on Page ${page}`,
        icon: "success",
        button: "Next Card",
        className: "modal",
      });
    }

  } // end computeGridSpace

  