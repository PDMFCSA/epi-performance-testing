# epi-performance-testing

### Overview

This repository contains performance testing scripts and configuration for the PharmaLedger project APIs, focused on simulating realistic loads and evaluating API responsiveness under various conditions.

### Contents

The repository is structured as follows:

- backend/: Contains server-side scripts related to API performance testing.
- frontend/: Contains client-side testing scripts targeting the main APIs used by the LWA application. Some scripts use the K6 testing tool and its cloud feature to generate requests from specific geographic locations.
- config.json: The main configuration file that specifies the test environment variables such as API endpoints, load profiles, and test data.

### Scripts

The primary scripts for executing performance tests include the following:

* backend/backendPerformanceTest.js This script performs API calls to create products, batches, and upload leaflets. The main KPI of the test is to create at least 1,000 products, each with 2 leaflets, in under 8 hours.
* frontend/nodeJSPerfTests/main.js This is a Node.js script that reads all available batches of products containing leaflets in order to generate a dataset of URLs. Once the list is created, requests will be generated for each URL to record performance metrics. This script provides metrics from a local machine and is geographically dependent on the location of the user running the script. 
* frontend/k6PerfTests/runK6Test.js This is a Node.js script that constructs a dataset similar to the one in the previous script, and then calls a K6 command to make requests for each of the collected URLs. Afterward, it makes another K6 call, randomly selecting one URL from the dataset, and attempts to make as many requests as possible within a specific preconfigured time interval. The K6 tests execute requests against the gtinOwner and getLeaflet endpoints. Test execution occurs in a preconfigured geographic location (set up in K6 Cloud), and all results are pushed there to provide visual representation and insights about the test execution.

### Getting Started

1. Clone the repository:

```git clone https://github.com/axiologic-pla/epi-performance-testing```

2. Install dependencies and ensure k6 is installed to run the tests.

3. Update config.json with the appropriate API endpoints and environment settings.

4. Run the tests:

``` cd backend && node backendPerformanceTest.js ```

``` cd frontend/nodeJsPerfTests/ && node main.js ```

``` cd frontend/k6PerfTests/ && node runK6Test.js ```

5. At the end check the terminal where the script was executed and identify the report file path.

### Running K6 Cloud
1. Update the config.json file entry "cloudExecution" from false to true.
2. If needed, select the proper load zone from the following link: https://k6.io/docs/cloud/creating-and-running-a-test/cloud-scripting-extras/load-zones/ and update the config.json "loadZone" property.
3. Execute the ``` k6 login cloud --token {replacewithyourtoken} ``` cmd in order to login into k6 cloud.
4. Run the test ``` cd frontend/k6PerfTests/ && node runK6Test.js ```
5. At the end check the k6 cloud dashboard for the results.

