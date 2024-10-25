const {getAccessToken} = require('../utils');
const {generateRandomGTIN14, generateRandomBatchNumber, convertLeafletFolderToObject} = require('./backendUtils');
const {domain, subdomain} = require('../config.json').common;
const fs = require('fs');
const path = require('path');
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
        "nameMedicinalProduct": "Product",
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
        "batchNumber": "",
        "packagingSiteName": "",
        "expiryDate": "230600"
    }
};

const updateProduct = async (gtin, client) => {
    productDetails.payload.inventedName = `Product ${generateRandomBatchNumber(5)}`;
    productDetails.payload.nameMedicinalProduct = productDetails.payload.inventedName;
    productDetails.payload.productCode = gtin;
    await client.updateProduct(gtin, productDetails);
};

const updateBatch = async (gtin, batchNumber, client) => {
    batchDetails.payload.productCode = gtin;
    batchDetails.payload.batchNumber = batchNumber;
    await client.updateBatch(gtin, batchNumber, batchDetails);
};

const updateProductEPI = async (gtin, language, leafletObject, client) => {
    leafletObject.payload.productCode = gtin;
    leafletObject.payload.language = language;
    delete leafletObject.payload.batchNumber;
    await client.updateProductEPI(gtin, language, "leaflet", leafletObject);
};

const updateBatchEPI = async (gtin, batchNumber, language, leafletObject, client) => {
    leafletObject.payload.productCode = gtin;
    leafletObject.payload.batchNumber = batchNumber;
    leafletObject.payload.language = language;
    await client.updateBatchEPI(gtin, batchNumber, language, "leaflet", leafletObject);
};

const serverIsReadyToReceiveRequests = async (client) => {
    const fixedUrlStatus = await client.getFixedURLStatus();
    return fixedUrlStatus.scheduled === 0 && fixedUrlStatus.inProgress === 0;
};

let NO_PRODUCTS = 1000;
let NO_PARALLEL_REQUESTS = 10;
const PATH_TO_LEAFLET_FOLDER = "./leaflets/productC";
const TIME_BETWEEN_REQUESTS = 60000; // 1 second
const TIME_BETWEEN_READINESS_CHECKS = 5000;
const NO_REQUESTS_BEFORE_SLEEPING = 100;
// create results folder
const RESULTS_DIR = "./results/";
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR);
}

// Path to the CSV file
const timestamp = Date.now();
const CSV_FILE_PATH = path.join(RESULTS_DIR, `results_${NO_PRODUCTS}_products_${NO_PARALLEL_REQUESTS}_parallel_requests_${timestamp}.csv`);
// Path to the error log file
const ERROR_LOG_FILE_PATH = path.join(RESULTS_DIR, `error_${NO_PRODUCTS}_products_${NO_PARALLEL_REQUESTS}_parallel_requests_${timestamp}.log`);

// Function to write CSV headers if the file does not exist
const writeCSVHeaders = () => {
    if (!fs.existsSync(CSV_FILE_PATH)) {
        const headers = "Completed Requests,Time Taken (seconds),Errors\n";
        fs.writeFileSync(CSV_FILE_PATH, headers);
    }
};

// Function to append data to the CSV file
const appendToCSV = (completedRequests, timeTaken, errors) => {
    const row = `${completedRequests},${timeTaken},${errors}\n`;
    fs.appendFileSync(CSV_FILE_PATH, row);
};

// Utility function to sleep for a given amount of milliseconds
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForServerReadiness = async (client) => {
    while (!(await serverIsReadyToReceiveRequests(client))) {
        console.log(`Server is not ready. Checking again in ${TIME_BETWEEN_READINESS_CHECKS / 1000} seconds`);
        await sleep(TIME_BETWEEN_READINESS_CHECKS); // Wait before checking again
    }
    console.log('Server is ready to receive requests. Continuing...');
};

const addProducts = async () => {
    const Client = require('./SoRClient');
    const leaflet = convertLeafletFolderToObject(PATH_TO_LEAFLET_FOLDER);
    let accessToken = await getAccessToken();
    let client = new Client(domain, subdomain, accessToken);
    let completedRequests = 0;
    let errors = 0; // To track errors for every 100 requests

    // Function to update product and batch
    const processProduct = async () => {
        const gtin = generateRandomGTIN14();
        try {
            await updateProduct(gtin, client);
            await updateProductEPI(gtin, 'en', leaflet, client);
            await updateProductEPI(gtin, 'fr', leaflet, client);
            await updateBatch(gtin, generateRandomBatchNumber(), client);
            completedRequests++;
            console.log(`Completed request for product with GTIN: ${gtin}. Total completed: ${completedRequests}`);
        } catch (error) {
            if (error.code === 401) {
                accessToken = await getAccessToken();
                client = new Client(domain, subdomain, accessToken);
            } else if(error.code !== 429){
                console.log(error);
                // write error to an error log file
                fs.appendFileSync(ERROR_LOG_FILE_PATH, `Error processing product with GTIN: ${gtin}. Error: ${error.message}\n`);
                console.error(`Error processing product with GTIN: ${gtin}. Retrying...`);
                errors++;
            }
            await retryRequest(gtin, client); // Retry logic
        }
    };

    const retryRequest = async (gtin, client, retries = 3) => {
        let attempt = 0;
        while (attempt < retries) {
            try {
                await updateProduct(gtin, client);
                await updateProductEPI(gtin, 'en', leaflet, client);
                await updateProductEPI(gtin, 'fr', leaflet, client);
                await updateBatch(gtin, generateRandomBatchNumber(), client);
                completedRequests++;
                console.log(`Retry successful for GTIN: ${gtin}`);
                return;
            } catch (error) {
                await sleep(TIME_BETWEEN_REQUESTS);
                attempt++;
                console.error(`Retry ${attempt}/${retries} failed for GTIN: ${gtin}`);
            }
        }
        console.error(`Failed after ${retries} attempts for GTIN: ${gtin}`);
    };

    const startTime = Date.now(); // Start time tracking
    let timePerHundredRequests = startTime;

    // Function to execute requests in batches
    const makeBatchRequests = async () => {
        while (completedRequests < NO_PRODUCTS) {
            const batch = [];
            // Fill the batch with NO_PARALLEL_REQUESTS requests
            for (let i = 0; i < NO_PARALLEL_REQUESTS && completedRequests < NO_PRODUCTS; i++) {
                batch.push(processProduct());
            }
            // Wait for all requests in the batch to finish
            await Promise.all(batch);

            // Check server readiness before processing the next batch
            // await waitForServerReadiness(client);

            if (completedRequests % 100 === 0 || completedRequests % 100 === 1 || completedRequests % 100 === 2) {
                const endTime = Date.now();
                const timeTaken = (endTime - timePerHundredRequests) / 1000;
                console.log(`Completed ${completedRequests} requests in ${timeTaken} seconds with ${errors} errors`);
                appendToCSV(completedRequests, timeTaken, errors); // Append to CSV
                errors = 0; // Reset error count after logging
                timePerHundredRequests = endTime;
                timePerHundredRequests = Date.now();
            }
            if (completedRequests % NO_REQUESTS_BEFORE_SLEEPING === 0 || completedRequests % NO_REQUESTS_BEFORE_SLEEPING === 1 || completedRequests % NO_REQUESTS_BEFORE_SLEEPING === 2) {
                console.log(`Sleeping for ${TIME_BETWEEN_REQUESTS / 1000} seconds `);
                await sleep(TIME_BETWEEN_REQUESTS);
            }
        }
    };

    // Start the process
    try {
        writeCSVHeaders(); // Ensure CSV has headers before processing
        await makeBatchRequests();
    } catch (e) {
        console.error(e);
        return;
    }

    // Final time tracking
    const totalEndTime = Date.now();
    console.log(`Total time to complete all ${NO_PRODUCTS} requests: ${(totalEndTime - startTime) / 1000} seconds`);
};

// Call the addProducts function
addProducts();
