




// ░█─░█ █▀▀ █▀▀ █▀▀█ 　 ─█▀▀█ █▀▀ ▀▀█▀▀ ─▀─ █▀▀█ █▀▀▄ █▀▀ 
// ░█─░█ ▀▀█ █▀▀ █▄▄▀ 　 ░█▄▄█ █── ──█── ▀█▀ █──█ █──█ ▀▀█ 
// ─▀▄▄▀ ▀▀▀ ▀▀▀ ▀─▀▀ 　 ░█─░█ ▀▀▀ ──▀── ▀▀▀ ▀▀▀▀ ▀──▀ ▀▀▀
/**
 * //Open new position if size is 0 and begin poll. Otherwise return.
 * @param {*} currentPos 
 * @returns 
 */
function StartBot() {
    //Open new position if size is 0 and begin poll. Otherwise return.
    if(currentPos.size < 0){
        console.log(`Can't start bot while poistion is already open: Positions Size: ${currentPos.size}`);
        return;
    }
    else{
        //Open new position

        //Begin polling for events

    }
}

/**
 * Stop Polling for events and cancel all open orders
 */
function CancelBot() {

}

/**
 * Calls CancelBot in addition to closing out position at Market Price.
 */
function KillBot() {
    
}