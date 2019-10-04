const LambdaLogs = require('./lambda-logs');
const utils = require('./utils');

(async () => {

    /* Get inputs from user */
    let input = await utils.getInputs();

    if(input) {
        /* Create an instace of lambda logs with the user inputs */
        const lambdaLogs = new LambdaLogs(input.lambda, input.start, input.end, input.profile, input.output);
        
        try {

            /* Fetch logs streams */
            console.log('\nFetching Log Streams. Please Wait...');
            await lambdaLogs.fetchLogStreams();

            /* Fetch logs events */
            console.log('Fetching Events. Please Wait...');
            await lambdaLogs.getLogEvents();

            /* Search for strings in logs */
            if(input.search.split(',').length > 0)
                await lambdaLogs.search(input.search.split(','));
            
            /* Generate csvlogs  */
            await lambdaLogs.generateLogsCSV();
        }
        catch(err) {
            console.log(err);
        }
    }

})();
