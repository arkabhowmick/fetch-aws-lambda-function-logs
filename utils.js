const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

module.exports = {
    getInputs : async function() {
        let input = {};

        try {

            input.lambda = await fetchInput('Lambda Function Name * : ');
            if(!input.lambda) 
                throw 'Lambda Function Name is required.';
            input.start = await fetchInput('Log Start Time (MM-DD-YYYY or 13 digits timestamp) : ');
            input.start = getDate(input.start);
            if(input.start == 'Invalid Date')
                throw 'Invalid Date';
            input.end = await fetchInput('Log End Time (MM-DD-YYYY or 13 digits timestamp) : ');
            input.end = getDate(input.end);
            if(input.end == 'Invalid Date')
                throw 'Invalid Date';
            if(input.start && input.end && input.end < input.start)
                throw 'Start Date cannot be greater than End Date.';
            input.profile = await fetchInput('AWS-CLI Profile : ');
            input.search = await fetchInput('Search Keys (separate words by comma) : ');
            input.output = await fetchInput('Output Folder : ');
            input.output = input.output ? input.output : 'output';

        }
        catch(err) {

            console.error(err);
            input = null;

        }
        finally {

            rl.close();
            return Promise.resolve(input);

        }
    }
};

function fetchInput(question) {
    return new Promise((resolve, reject) => {

        rl.question(question, (answer) => {
            resolve(answer);
        });

    });
}

function getDate(input) {
    if(!input) {
        return null;
    }
    let output = '';
    if(!isNaN(parseInt(input))) {
        output = new Date(input);
    }
    else {
        output = new Date(parseInt(input));
    }
    return output;
}
