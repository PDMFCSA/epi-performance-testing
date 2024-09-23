const {getAccessToken} = require('../utils');
const {generateRandomGTIN14, generateRandomBatchNumber, convertLeafletFolderToObject} = require('./backendUtils');
const {domain, subdomain} = require('../config.json').common;
const productDetails = {
    "messageType": "Product",
    "messageTypeVersion": 1,
    "senderId": "ManualUpload",
    "receiverId": "QPNVS",
    "messageId": "S000001",
    "messageDateTime": "2023-01-11T09:10:01CET",
    "payload": {
        "productCode": "",
        "internalMaterialCode": "",
        "inventedName": "BOUNTY",
        "nameMedicinalProduct": "BOUNTY® 250 mg / 0.68 mL pre-filled syringe",
        "strength": ""
    }
};

const batchDetails = {
    "messageType": "Batch",
    "messageTypeVersion": 1,
    "senderId": "ManualUpload",
    "receiverId": "QPNVS",
    "messageId": "S000001",
    "messageDateTime": "2023-01-11T09:10:01CET",
    "payload": {
        "productCode": "",
        "batchNumber": "B123",
        "packagingSiteName": "",
        "expiryDate": "230600"
    }
};

const updateProduct = async (client) => {
    const gtin = generateRandomGTIN14();
    productDetails.payload.inventedName = `Product ${generateRandomBatchNumber(5)}`;
    productDetails.payload.nameMedicinalProduct = productDetails.payload.inventedName;
    productDetails.payload.productCode = gtin;
    await client.updateProduct(gtin, productDetails);
}

const updateBatch = async (gtin, client) => {
    const batchNumber = generateRandomBatchNumber();
    batchDetails.payload.productCode = gtin;
    batchDetails.payload.batchNumber = batchNumber;
    await client.updateBatch(gtin, batchNumber, batchDetails);
}

const updateProductEPI = async (gtin, language, leafletObject, client) => {
    leafletObject.payload.productCode = gtin;
    await client.updateProductEPI(gtin, language, "leaflet", leafletObject);
}

const updateBatchEPI = async (batchObject, language, leafletObject, client) => {
    leafletObject.payload.productCode = batchObject.productCode;
    leafletObject.payload.batchNumber = batchObject.batchNumber;
    await client.updateBatchEPI(batchObject.productCode, batchObject.batchNumber, language, "leaflet", leafletObject);
};

let NO_PRODUCTS = 1000;
let NO_BATCHES = 1000;
const PATH_TO_LEAFLET_FOLDER = "./leaflets/productA";

const addProducts = async () => {
    const Client = require('./SoRClient');
    const leaflet = convertLeafletFolderToObject(PATH_TO_LEAFLET_FOLDER);
    const accessToken = await getAccessToken();
    const client = new Client(domain, subdomain, accessToken);
    let completedRequests = 0;

    // Function to update product and batch
    const processProduct = async () => {
        const gtin = generateRandomGTIN14();
        await updateProduct(client);
        await updateProductEPI(gtin, 'en', leaflet, client);

        completedRequests++;
    };

    const startTime = Date.now(); // Start time tracking
    let timePerHundredRequests = startTime;

    const queue = [];

    const makeRequest = async () => {
        while (completedRequests < NO_PRODUCTS) {
            if (queue.length < 5 && completedRequests < NO_PRODUCTS) {
                // Add the next product processing request if there's room in the queue
                const request = processProduct();
                queue.push(request);

                request.finally(() => {
                    // Once the request is done, remove it from the queue
                    queue.splice(queue.indexOf(request), 1);

                    // Every 100 requests, log the time taken
                    if (completedRequests % 100 === 0) {
                        const endTime = Date.now();
                        console.log(`Completed ${completedRequests} requests in ${(endTime - timePerHundredRequests) / 1000} seconds`);
                        timePerHundredRequests = endTime; // Reset timer for next 100
                    }
                });
            }
            // Wait until one of the promises finishes before proceeding
            if (queue.length === 5) {
                await Promise.race(queue);
            }
        }
    };

    // Start the process
    try {
        await makeRequest();
    } catch (e) {
        console.error(e);
    }

    // Final time tracking
    const totalEndTime = Date.now();
    console.log(`Total time to complete all ${NO_PRODUCTS} requests: ${(totalEndTime - startTime) / 1000} seconds`);
};

// Call the addProducts function
addProducts();
