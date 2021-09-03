//this script contains the logic to invoke the endpoint 'scrs' to process incorporations available from the submission endpoint within the last 2 hours

function log(message) {
    logger.error("SCRS_WRAPPER - " + message);
}

function minusHours(h) {
    var date = new Date();
    date.setHours(date.getHours() - h);
    return date;
}

function padding(num) {
    return num < 10 ? '0' + num : num;
}

let date = minusHours(2);

let defaultTimepoint = [
    date.getFullYear(),
    padding(date.getMonth() + 1),
    padding(date.getDate()),
    padding(date.getHours()),
    padding(date.getMinutes()),
    padding(date.getSeconds()),
    date.getMilliseconds()
].join("");

log("SCRS Scheduled Run");

let endpointResponse = openidm.action(
                            "endpoint/scrs", 
                            "read", 
                            null, 
                            {
                                "timepoint" : defaultTimepoint
                            }, 
                            null);

log("SCRS Scheduled Run - response:  " + JSON.stringify(endpointResponse));
