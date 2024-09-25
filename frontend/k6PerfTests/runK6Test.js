const { execSync } = require('child_process');
const path = require('path');
const utils = require("./../../utils.js");
const RESULTS_DIR = "k6-scripts/data/";
const config = require("./../../config.json");
const SORClient = require("../../backend/SoRClient.js");
const fs = require('fs');
const fsPromises = fs.promises;

process.on("uncaughtException", (err) => {
    console.log(err);
});

(async () => {
    console.log("Obtaining the accessToken...");
    const token = await utils.getAccessToken();
    console.log("Token obtained");

    const client = new SORClient(config.common.domain, config.common.subdomain, token);

    console.log(`Collecting info about the targeted system ${config.common.mahUrl}`);
    const start = process.hrtime();

    const {targetLeaflets, leafletCounter} = await utils.availableLeafletRetrieval(client);

    const stop = process.hrtime(start);
    console.log(`Found a total of ${leafletCounter} leaflets in ${stop[0]} seconds.`);

    let jsonInputs = [];
    for (let batchNumber in targetLeaflets) {
        let { productCode, langs } = targetLeaflets[batchNumber];
        for (let lang of langs) {
            jsonInputs.push({"gtin": productCode, "batch": batchNumber, "lang": lang, "leaflet_type": "leaflet"});
        }
    }

    let resultFileName = `LeafletData_${Date.now()}.json`;
    await fsPromises.mkdir(RESULTS_DIR, { recursive: true });
    const filePath = RESULTS_DIR + resultFileName;
    await fsPromises.writeFile(filePath, JSON.stringify(jsonInputs, undefined, 4), "utf8");
    console.log(`Finished to save the collected results into file ${resultFileName}`);

    const cmd = `k6 run -e RANDOM=1 -e PLA_DEBUG=1 -e PLA_DATA='../../${filePath}' -e PLA_BDNS=${config.common.domain} -e PLA_HOSTNAME='${config.frontend.url}' './k6-scripts/src/pla_getLeaflets.js'`
    console.log(`Preparing to execute the cmd: ${cmd}`);

    execSync(cmd, { stdio: 'inherit'});

    process.exit(0);
})();
