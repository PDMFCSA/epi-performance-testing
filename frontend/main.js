const { fork } = require('child_process');
const path = require('path');
const utils = require("./../utils.js");
const config = require("./../config.json");
const SORClient = require("../backend/SoRClient.js");
const fs = require('fs');
const fsPromises = fs.promises;

// Path to the worker script
const workerScript = path.join(__dirname, 'worker.js');

// Run the subprocess 100 times
const totalRequests = 100;
const results = [];

function runRequest(i, url) {
    return new Promise((resolve) => {
        const subprocess = fork(workerScript);

        subprocess.on('message', (message) => {
            message.url = url;
            results.push(message); // Collect the metrics from the worker
            console.log(`Request ${i + 1}:`, message);
            resolve();
        });

        subprocess.send({ id: i + 1, url}); // Send an id to the worker process
    });
}

process.on("uncaughtException", (err) => {
    console.log(err);
});

(async () => {
    console.log("Obtaining the accessToken...");
    const token  = await utils.getAccessToken();
    console.log("Token obtained");

    const client = new SORClient(config.common.domain, config.common.subdomain, token);

    console.log(`Collecting info about the targeted system ${config.common.mahUrl}`);
    let batches;
    try{
        console.log(`Collecting info about available batches...`);
        batches = await client.listBatches(0,1000,'__timestamp > 0', "desc");
        console.log(`Found a number of ${batches.length} existing batches.`);
    }catch (e){
        console.log(e)
    }

    let targetLeaflets= {};
    let leafletCounter=0;
    if (batches){
        console.log(`Collecting info about available leaflets...`);
        for(let batch of batches){
            let {productCode, batchNumber} = batch;
            let langs = await client.listProductLangs(productCode, "leaflet");
            let batchLangs = await client.listBatchLangs(productCode, batchNumber, "leaflet");
            let availableLangs = [...new Set([...langs ,...batchLangs])];

            if(availableLangs.length > 0){
                targetLeaflets[batchNumber] = {productCode, langs: availableLangs};
                leafletCounter += availableLangs.length;
            }
            if(leafletCounter>1){
                break;
            }
        }
        console.log(`Found a number of ${leafletCounter} leaflets.`);
    }

    let requestCounter = 0;
    console.log(`Preparing to start the leaflet requests`);
    for(let batchNumber in targetLeaflets){
        let target = targetLeaflets[batchNumber];
        let {productCode, langs} = target;
        for(let lang of langs){
            let url = `${config.common.mahUrl}/leaflets/${config.common.domain}?gtin=${productCode}&lang=${lang}&leaflet_type=leaflet&batch=${batchNumber}`;
            await runRequest(requestCounter, url);
            requestCounter++;
            console.log(`Executed requests counter: ${requestCounter}`);
        }
    }
    console.log('All requests finished.');

    console.log("Preparing to save the collected results...");
    let csv = "";
    let columns;
    for(let result of results){
        if(!columns){
            columns = [];
            for(let name in result){
                columns.push(name);
                csv += name+',';
            }
            csv = csv.replace(/.$/,"\n");
        }
        for(let column of columns){
            csv += result[column]+",";
        }
        csv = csv.replace(/.$/,"\n");
    }

    let resultFileName = `Result_${Date.now()}.csv`;
    await fsPromises.mkdir("../results/frontend/", {recursive: true});
    await fsPromises.writeFile("../results/frontend/"+resultFileName, csv, "utf8");
    console.log(`Finished to save the collected results into file ${resultFileName}`);
    process.exit(0);
})();
