const fs = require('fs');
const shell = require('shelljs');
const cliProgress = require('cli-progress');
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

class LambdaLogs {

    constructor(lambdaFunction, startDate, endDate, profile, outputFolder) {
        this.lambdaFunction = lambdaFunction;
        this.startDate = startDate ? startDate : null;
        this.endDate = endDate ? endDate : null;
        this.logGroupName = `/aws/lambda/${lambdaFunction}`;
        this.outputFolder = outputFolder;
        this.profile = profile;
        this.logStreams = null;
        this.logEvents = null;
        this.logsData = [];
        this.searchedLogs = [];
    }

    /* Fetch log streams from cloudwatch */
    fetchLogStreams() {
        return new Promise((resolve, reject) => {
            let command = `aws logs describe-log-streams --log-group-name ${this.logGroupName} ${this.profile ? `--profile ${this.profile}` : ''}`;

            shell.exec(command, { silent: true }, (code, stdout, stderr) => {
                if(stderr) {
                    reject(stderr);
                }
                else {
                    try {
                        this.logStreams = JSON.parse(stdout).logStreams;
                        if(this.logStreams.length == 0) {
                            reject('No Logs Streams found.');
                        }
                    }
                    catch(err) {
                        reject(err);
                    }
                }
                resolve();
            });
        });
    }

    /* Return the log streams in JSON */
    getLogStreamsJSON() {
        return JSON.stringify(this.logStreams);
    }

    /* Return the log streams */
    getLogStreams() {
        return this.logStreams;
    }

    /* Fetch log events for all log streams */
    async getLogEvents() {
        let functionsToPerform = [];

        /* Start progress bar */
        progressBar.start(this.logStreams.length, 0);
        let progress = 0;

        /* loop through the fetched log streams */
        for(let index in this.logStreams) {
            let logStream = this.logStreams[index];

            /* Fetch the log events for each log stream */
            functionsToPerform.push((async () => {
                let logData = null;
                /* Conditions to check if the log stream's timestamp falls within our required time */
                if(this.startDate && this.endDate) {
                    if(logStream['creationTime'] >= this.startDate && logStream['creationTime'] <= this.endDate)
                    logData = await this.getLogEvent(logStream['logStreamName']);
                }
                else if(this.startDate) {
                    if(logStream['creationTime'] >= this.startDate)
                    logData = await this.getLogEvent(logStream['logStreamName']);
                }
                else if(this.endDate) {
                    if(logStream['creationTime'] <= this.endDate)
                    logData = await this.getLogEvent(logStream['logStreamName']);
                }
                else {
                    logData = await this.getLogEvent(logStream['logStreamName']);
                }
                if(logData) {
                    this.addLog({
                        timestamp : logStream['creationTime'],
                        logData : logData.events
                    });
                }           
                /* Update progress bar percentage */
                progressBar.update(++progress);  

                return Promise.resolve();
            })());
        }

        await Promise.all(functionsToPerform);
        
        /* Stop the progress bar */
        progressBar.stop();

        /* Return */
        return Promise.resolve();
    }

    /* Get log event */
    getLogEvent(logStreamName) {
        return new Promise((resolve) => {
            let output = null;
            let command = `aws logs get-log-events --log-group-name ${this.logGroupName} --log-stream-name ${logStreamName.replace('$', '\\$')} ${this.profile ? `--profile ${this.profile}` : ''}`;
            // console.log('Command : ', command);
            shell.exec(command, {silent:true}, (code, stdout, stderr) => {
                if(stdout) {
                    output = JSON.parse(stdout);
                }
                else if(stderr) {
                    console.log('Error : ');
                }
                resolve(output);
            });
        });
    }

    /* Add log */
    addLog(log) {
        this.logsData.push(log);
    }

    /* Get logs */
    getLogs() {
        return this.logsData;
    }

    /* Do a string search */
    search(keys) {
        this.logsData.forEach((log, index) => {
            let found = false;
            for(let index in log.logData) {
                keys.forEach((key) => {
                    let message = log.logData[index].message;
                    if(message.toLowerCase().includes(key.toLowerCase())) {
                        found = true;
                    }
                });
                if(found) break;
            }
            if(!found) {
                delete(this.logsData[index]);
            }
        });
    }

    /* Generate the csv files */
    async generateLogsCSV() {
        let functionsToPerform = [];
        this.logsData.forEach((log) => {
            if(log) {
                let outputDirectory = `${this.outputFolder}/${this.lambdaFunction}`;
                for(let index in outputDirectory.split('/')) {
                    let dir = [];
                    for(let index1 = 0; index1<=index; index1 ++) {
                        dir.push(outputDirectory.split('/')[index1]);
                    }
                    if (!fs.existsSync(dir.join('/'))) {
                        fs.mkdirSync(dir.join('/'));
                    }
                } 
                let date = new Date(log.timestamp);
                let filename = `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}--${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.csv`;
                let outputPath = `${outputDirectory}/${filename}`;
                functionsToPerform.push(this.generateCsv(outputPath, log.logData));
            }
        });
        await Promise.all(functionsToPerform);
        return Promise.resolve();
    }

    /* Generate individual csv */
    generateCsv(outputPath, data) {
        return new Promise((resolve, reject) => {
            let output = [`"Date", "Time", "Timestamp", "Message"`];
            data.forEach((log) => {
                let date = new Date(log.timestamp);
                let day = `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
                let time = `${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
                
                output.push(`"${day}", "${time}", "${log.timestamp}", "${log.message.replace(/\n/g, '  ').replace(/,/g, '.').replace(/"/g, "'")}"`);
            });
            fs.writeFile(outputPath, output.join('\n'), (err, data) => {
                if(err) {
                    console.log('Error : ', err);
                }
                resolve();
            });
        });
    }
}

module.exports = LambdaLogs;
