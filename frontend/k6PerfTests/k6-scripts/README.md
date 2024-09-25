# epi-loadtest

Scripts for load testing of epi for Pharma Ledger.

## Requirements

- [k6](https://k6.io/docs/get-started/installation/)

## Description of available tests

Current tests uses "ramp-up execution type" - execute test scenario by adding concurent users until a target number of concurent users is achieve in given time. For detail see execution patterns section.
## Execution 

Execute load test using following commands

```bash
k6 run <parameters> <script_name>
```
### Example with using parameters:

```bash
 k6 run -e RANDOM=1 -e PLA_DEBUG=1 -e PLA_DATA='../data/test.json' -e PLA_BDNS=dryrun2.epi -e PLA_HOSTNAME='https://dryrun-quo4.pla.health' pla_getLeaflets.js 
```

### Example with using headers key :

```bash
 k6 run -e PLA_DATA='../data/leafletData_example.json'  -e PLA_BDNS='preqa.epi' -e PLA_HOSTNAME='https://pqnah2.pladev.com' -e PLA_HEADER_KEY='X-api-key' -e PLA_HEADER_VAL='AIzaSyDaGmWKa4JsXZ' pla_getLeaflets.js 
```


### pla_getLeaflets

Load testing of API calls that are used to retrieve leaflets from API_HUB server. Contains two scenarios `gtinOwner` and `getLeaflet`, which can be executed in sequential or paralel manner. Utilize pre-generate data from [data](./data/) directory - see [example](./data/leafletData_example.json).

Test generates HTML formatted output to [reports directory](./reports/). Report file has suffix corresponding to run datetime.


#### Execution pattern

| Scenario name |Initial number of executors | Target number of executors  | Time period |
|-----|------|---------|-------------|
| gtinOwner | 0 | 20 | 3 minutes|
| gtinOwner | 20 | 50 | 3 minutes|
| gtinOwner | 50  | 0 | 3 minutes|
| getLeaflet | 0 | 20 | 3 minutes|
| getLeaflet | 20 | 50 | 3 minutes|
| getLeaflet | 50  | 0 | 3 minutes|

#### Metrics

Test result are evaluated against a pre-defined tresholds. Statics metrics as percentil are usually used, here p95 - 95th percentil and p99 - 99th percentil is defined. For parameters see table:


| Scenario name | Metric | Limit value   |
|-----|---------|---------|
| gtinOwner | p95 |  900 miliseconds |
| gtinOwner | p99 |  1 second |
| getLeaflet | p95 |  900 miliseconds |
| getLeaflet | p99 |  1 second |

#### Environment variables

| ENV variable | Type | Default | Description |
|-----|------|---------|-------------|
| PLA_DATA | string | "" | Path to source file with data - must be a JSON file. For structure example refere to [example](./data/leafletData_example.json). |
| PLA_DEBUG | integer | 0 | Set to 1 to generate formatted url to standard output during test execution - can help with parameters debug |
| PLA_RANDOM | integer | 0 | Set to 1 to ensure that data from data file are executed in the random order, otherwise only first item is used as parameter. |
| PLA_BDNS | string | "" | BDNS domain value, that will be used to retrieve data. Example `dryrun2.epi` |
| PLA_HOSTNAME | string | "" | Hostname of server hosting API_HUB, provide including http/s specifier, please, include port if needed.   Example: `https://dryrun-quo4.pla.health` |
| PLA_HEADER_KEY | string | "" | Name of header key to be send with the request.   Example: `X-api-key` |
| PLA_HEADER_VAL | string | "" | Value of header to be send with the request.  Example: `IzaSyDaGmWKa4JsXZ` |
### Useful links

- [https://k6.io/docs/get-started/running-k6/](https://k6.io/docs/get-started/running-k6/)
- [https://k6.io/docs/get-started/results-output/](https://k6.io/docs/get-started/results-output/)
- [https://k6.io/docs/examples/](https://k6.io/docs/examples/)
