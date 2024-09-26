# epi-performance-testing

### Overview

This repository contains performance testing scripts and configuration for the PharmaLedger project APIs, focused on simulating realistic loads and evaluating API responsiveness under various conditions.

### Contents

The repository is structured as follows:

- backend/: Contains server-side scripts related to API performance testing.
- frontend/: Contains client-side related testing scripts, targeting main APIs used by the LWA application. Some scripts use k6 test tool and it's cloud feature in order to create requests from specific geographic locations.
- config.json: The main configuration file that specifies the test environment variables such as API endpoints, load profiles, and test data.

### Scripts

The primary scripts for executing performance tests include the following:

* backend/backendPerformanceTest.js This script performs API calls to create products, batches and upload leaflets. THe main KPI of the test is to create a number of at least 1000 products with 2 leaflets each in under 8 hours.
* frontend/nodeJSPerfTests/main.js This is a Node.JS script which reads all the available batches of products that leaflets in order to generate a dataset of urls. Once the list is created will generate requests for each of the url in order to record performance metrics. This script will provide the metrics from a local machine and it is geographic dependent on the location of the user which runs the script. 
* frontend/k6PerfTests/runK6Test.js This is a Node.JS script which reads constructs the dataset similar with the above script and after that is calling a K6 command in order to make requests for each of the collected url. After this it does another K6 call and picks randomly ONE url from the dataset and tries to make requests as much as possible in a specific preconfigured time interval. The k6 tests are executing requests agains gtinOwner and getLeaflet endpoints. Test execution is done in a preconfigured geographic location (set up in K6 Cloud) and all the results are pushed there in order to obtain visual representation and insight about the test execution.

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

