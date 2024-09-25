const { fork } = require('child_process');
const path = require('path');
const utils = require("./../../utils.js");
const RESULTS_DIR = "../../results/frontend/";
const config = require("./../../config.json");
const SORClient = require("../../backend/SoRClient.js");
const fs = require('fs');
const fsPromises = fs.promises;

// Path to the worker script
const workerScript = path.join(__dirname, 'worker.js');

const results = [];
let requestCounter = 0;
let activeWorkers = 0;

// Function to run a single request
function runRequest(i, url) {
    return new Promise((resolve) => {
        const subprocess = fork(workerScript);

        subprocess.on('message', (message) => {
            message.url = url;
            results.push(message); // Collect the metrics from the worker
            console.log(`Request ${i + 1}:`, message);
            resolve();
        });

        subprocess.send({ id: i, url }); // Send an id to the worker process
    });
}

async function executeContinuousRequests(urls) {
    const maxConcurrentRequests = config.frontend.vu;
    const startOfTest = process.hrtime();
    async function runNextRequest() {
        if (urls.length === 0) return;

        const url = urls.shift();
        activeWorkers++;
        requestCounter++;
        await runRequest(requestCounter, url);

        activeWorkers--;
        if (urls.length > 0) {
            runNextRequest();
        }
    }

    console.log(`Starting to make the requests...`);

    for (let i = 0; i < maxConcurrentRequests && urls.length > 0; i++) {
        runNextRequest();
    }

    while (activeWorkers > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const endOfTest = process.hrtime(startOfTest);
    console.log(`All requests finished. [${endOfTest} seconds]`);
}

// Function to save results to a CSV file
async function printResults() {
    if (results.length == 0) {
        console.log("No results collected yet. So nothing to save.");
        return;
    }

    console.log("Preparing to save the collected results...");
    let csv = "";
    let columns;
    results.sort((a, b) => a.id - b.id);
    for (let result of results) {
        if (!columns) {
            columns = [];
            for (let name in result) {
                columns.push(name);
                csv += name + ',';
            }
            csv = csv.replace(/.$/, "\n");
        }
        for (let column of columns) {
            csv += result[column] + ",";
        }
        csv = csv.replace(/.$/, "\n");
    }

    let resultFileName = `Result_${Date.now()}.csv`;
    await fsPromises.mkdir(RESULTS_DIR, { recursive: true });
    await fsPromises.writeFile(RESULTS_DIR + resultFileName, csv, "utf8");
    console.log(`Finished to save the collected results into file ${resultFileName}`);
}

process.on('SIGINT', async function () {
    //print the results before shutting down
    await printResults();
    process.exit();
});

process.on("uncaughtException", (err) => {
    console.log(err);
});

// Check if the configuration is valid
function testMinimalConfiguration() {
    if (!config.frontend.url) {
        throw Error("frontend.url property needs to be configured in the config.json file!");
    }

    if (config.frontend.vu) {
        console.log(`config.frontend.vu is set to ${config.frontend.vu}.`);
    } else {
        config.frontend.vu = 1;
    }
}

// Main function to execute the process
(async () => {
    testMinimalConfiguration();

    console.log("Obtaining the accessToken...");
    const token = await utils.getAccessToken();
    console.log("Token obtained");

    const client = new SORClient(config.common.domain, config.common.subdomain, token);

    console.log(`Collecting info about the targeted system ${config.common.mahUrl}`);
    const start = process.hrtime();

    await utils.availableLeafletRetrieval(client);

    const totalTime = process.hrtime(start);
    console.log(`Found a total of ${leafletCounter} leaflets in ${totalTime[0]} seconds.`);

    let urls = [];
    for (let batchNumber in targetLeaflets) {
        let { productCode, langs } = targetLeaflets[batchNumber];
        for (let lang of langs) {
            let url = `${config.frontend.url}/leaflets/${config.common.domain}?gtin=${productCode}&lang=${lang}&leaflet_type=leaflet&batch=${batchNumber}`;
            urls.push(url);
        }
    }

    await executeContinuousRequests(urls);
    await printResults();
    process.exit(0);
})();
