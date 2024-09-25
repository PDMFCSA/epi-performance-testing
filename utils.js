const config = require("./config.json");
const getAccessToken = async () => {
    const { clientId, clientSecret, tokenEndpoint, scope } = require('./config.json').common;
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', scope);

    let response;
    response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
    })

    let data = await response.json();
    return data.access_token;
}

const availableLeafletRetrieval = async function(client){
    let batches;
    try {
        console.log(`Collecting info about available batches...`);
        batches = await client.listBatches(0, 1000, '__timestamp > 0', "desc");
        console.log(`Found a number of ${batches.length} existing batches.`);
    } catch (e) {
        console.log(e);
    }

    let processedBatches = 0;
    let targetLeaflets = {};
    let leafletCounter = 0;

    if (batches) {
        console.log(`Collecting info about available leaflets...`);
        for (let batch of batches) {
            let { productCode, batchNumber } = batch;
            let langs = [];
            try {
                langs = await client.listProductLangs(productCode, "leaflet");
            } catch (e) {
                console.log(`Failed to read product [${productCode}] for available leaflet languages.`, e);
            }

            let batchLangs = [];
            try {
                batchLangs = await client.listBatchLangs(productCode, batchNumber, "leaflet");
            } catch (e) {
                console.log(`Failed to read batch [${batchNumber}, ${productCode}] for available leaflet languages`, e);
            }

            let availableLangs = [...new Set([...langs, ...batchLangs])];

            if (availableLangs.length > 0) {
                targetLeaflets[batchNumber] = { productCode, langs: availableLangs };
                leafletCounter += availableLangs.length;
                console.log(`Found ${availableLangs.length} more leaflet(s)...`);
            }
            processedBatches++;
            console.log(`Processed ${processedBatches} batch(es) so far...`);

            if (config.frontend.requestsMinimalTarget) {
                if (leafletCounter >= config.frontend.requestsMinimalTarget) {
                    console.log(`Achieved requestsMinimalTarget (>= ${config.frontend.requestsMinimalTarget}).`);
                    break;
                }
            } else {
                console.log(`requestsMinimalTarget config was not set.`);
                console.log(`Continuing to search for leaflets until we finish all the batches.`);
                console.log(`Remaining ${batches.length - processedBatches} batch(es) to be processed...`);
            }
        }

    }

    return {targetLeaflets, leafletCounter};
}

module.exports = {
    getAccessToken,
    availableLeafletRetrieval
}
