const { fork } = require('child_process');
const path = require('path');
const utils = require("./../utils.js");
const config = require("./../config.json");
const SORClient = require("../backend/SoRClient.js");

// Path to the worker script
const workerScript = path.join(__dirname, 'worker.js');

// Run the subprocess 100 times
const totalRequests = 100;
const results = [];

function runRequest(i, url) {
    return new Promise((resolve) => {
        const subprocess = fork(workerScript);

        subprocess.on('message', (message) => {
            results.push(message); // Collect the metrics from the worker
            console.log(`Request ${i + 1}:`, message);
            resolve();
        });

        subprocess.send({ id: i + 1}); // Send an id to the worker process
    });
}

process.on("uncaughtException", (err) => {
    console.log(err);
});

(async () => {
    const token  = await utils.getAccessToken();

    const client = new SORClient(config.common.domain, config.common.subdomain, token);
    let batches;
    try{
        batches = await client.listBatches(undefined,16,"", "desc");
    }catch (e){
        console.log(e)
    }

    if (batches){
        batches = batches.filter(async (batch) => {
            console.log(batch);
            return true;
        });
    }

    let url = config.common.mahUrl;

    for (let i = 0; i < totalRequests; i++) {
        await runRequest(i, url);
    }

    console.log('All requests finished.');
    // Process or save the collected results as needed
})();
