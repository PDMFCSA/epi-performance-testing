import { sleep, check } from 'k6'
import http from 'k6/http'
import { SharedArray } from 'k6/data'
import { Counter } from 'k6/metrics'

// import report bundle
import { htmlReport } from './lib/bundle.js'
//URL from jslib
import { URL, textSummary } from './lib/jslib.js'
// Load data from file
const data = new SharedArray('parameters', function () {
  let inputPath = '../data/leafletData_example.json'
  if (!(typeof __ENV.PLA_DATA === 'undefined' || __ENV.PLA_DATA === null)) {
    inputPath = __ENV.PLA_DATA.toString()
  }
  const f = JSON.parse(open(inputPath))
  return f // f must be an array[]
})
// Load Headers
if (typeof __ENV.PLA_HEADER_KEY !== 'undefined' || typeof __ENV.PLA_HEADER_VAL !== 'undefined') {
  const params = {
    headers: {
      '__ENV.PLA_HEADER_KEY': '__ENV.PLA_HEADER_KEY',
    },
  }
} else {
  const params = {}
}

// create a final result report
export function handleSummary(data) {
  const actDate = new Date().toISOString()
  const reportTitle = 'Get Leaflet executed on: '.concat(actDate)
  let filename = './k6-scripts/reports/result_'
    .concat(actDate.replace(/[^0-9]/g, ''))
    .concat('.html')
    .toString()
  console.log(filename, reportTitle)
  return {
    [filename]: htmlReport(data, { title: reportTitle }),
    //    stdout: textSummary (data, { indent: '  ', enableColors: true }),
  }
}

export const requests = new Counter('http_reqs')

export const options = {
  scenarios: {
    gtinOwner: {
      executor: 'ramping-vus',
      gracefulStop: '30s',
      stages: [
        {target: 20, duration: '1m'},
        {target: 50, duration: '3m'},
        {target: 0, duration: '3m'},
      ],
      gracefulRampDown: '30s',
      exec: 'gtinOwner',
      tags: {test_type: 'api'}, // tag for later definitions
    },
    getLeaflet: {
      startTime: '7m', // adapt to run gtinOwner and getLeaflet sequentially or in parallel. Now the getLeaflet will start after gtinOwner finishes approx. 7m.
      executor: 'ramping-vus',
      gracefulStop: '30s',
      stages: [
        {target: 20, duration: '1m'},
        {target: 50, duration: '3m'},
        {target: 0, duration: '3m'},
      ],
      gracefulRampDown: '30s',
      exec: 'getLeaflet',
      tags: {test_type: 'api'}, // tag for later definitions
    },
  },
  thresholds: { 'http_req_duration{test_type:api}': ['p(95)<2000', 'p(99)<3000'] }
}

export function getLeaflet(params) {
  //select random parameters set
  let itemNum = __ENV.PLA_RANDOM == 1 ? Math.floor(Math.random() * data.length) : 0
  //setting PLA_ALL will ensure that all url's from data set will be used during test
  if(__ENV.PLA_ALL == 1){
    itemNum = __ITER % data.length;  // This ensures we cycle through all URLs
  }
  const randomParam = data[itemNum]

  const url = new URL(`${__ENV.PLA_HOSTNAME}/leaflets/${__ENV.PLA_BDNS}`)
  url.searchParams.append('gtin', randomParam.gtin)
  url.searchParams.append('batch', randomParam.batch)
  url.searchParams.append('lang', randomParam.lang)
  url.searchParams.append('leaflet_type', randomParam.leaflet_type)

  if (__ENV.PLA_DEBUG == 1) {
    console.log(
      `${randomParam.gtin}, ${randomParam.batch}, ${randomParam.lang}, ${randomParam.leaflet_type},${url.toString()}`
    )
  }

  const response_1 = http.get(url.toString(), params)
  const checkRes_1 = check(response_1, {
    'getLeaflet: OK status 200': (r) => r.status === 200,
    'getLeaflet: OK req has body': (r) => r.body,
    'getLeaflet: OK body contains xml found': (r) => r.body.includes('xml_found'),
    'getLeaflet: Test failure': (r) =>
      (!r.body.includes('xml_found') && console.log('Status', r.status, 'Body', r.body)) || 'true',
  })
  // Automatically added sleep
  sleep(1)
}

export function gtinOwner(params) {
  //select random parameters set
  let itemNum = __ENV.PLA_RANDOM == 1 ? Math.floor(Math.random() * data.length) : 0
  //setting PLA_ALL will ensure that all url's from data set will be used during test
  if(__ENV.PLA_ALL == 1){
    itemNum = __ITER % data.length;  // This ensures we cycle through all URLs
  }
  const randomParam = data[itemNum]

  const url = new URL(`${__ENV.PLA_HOSTNAME}/gtinOwner/${__ENV.PLA_BDNS}/${randomParam.gtin}`)
  if (__ENV.PLA_DEBUG == 1) {
    console.log(`${url.toString()}`)
  }
  const response_2 = http.get(url.toString(), params)
  const checkRes_2 = check(response_2, {
    'gtinOwner: OK status 200': (r) => r.status === 200,
    'gtinOwner: OK req has body': (r) => r.body,
    'gtinOwner: OK body contains domain': (r) => r.body.includes('domain'),
    'gtinOwner: Test failure': (r) =>
      (!r.body.includes('domain') && console.log('Status', r.status, 'Body', r.body)) || 'true',
  })
  // Automatically added sleep
  sleep(1)
}
