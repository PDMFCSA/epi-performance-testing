function SoRClient(domain, subdomain, token) {
    const mahUrl = require("../config.json").common.mahUrl;
    const BASE_URL = `${mahUrl}/integration`;
    const _sendRequest = async (endpoint, method, data, responseType) => {
        if (!responseType) {
            responseType = "json";
        }
        if (endpoint.indexOf('?') !== -1) {
            endpoint += '&';
        } else {
            endpoint += '?';
        }
        endpoint += `domain=${encodeURIComponent(domain)}&subdomain=${encodeURIComponent(subdomain)}`;

        if (method === 'GET') {
            //https://internal-mah1.dev.pladevs.com/integration/listBatches?query=__timestamp%20%3E%200&start=0&number=1000&sort=desc&domain=dev.epi&subdomain=dev.epi.mah1

            //https://internal-mah1.dev.pladevs.com/integration/listBatches?query=__timestamp%20%3E%200&start=0&number=16&sort=desc&domain=dev.epi&subdomain=dev.epi.mah1
            let response = await fetch(endpoint, {method, headers: {Authorization: `Bearer ${token}`}});
            if (response.status >= 400) {
                let reason = await response.text();
                throw {code: response.status, reason}
            }
            if (responseType === "json") {
                return await response.json();
            } else {
                return await response.text();
            }
        } else {
            let body;
            if (method !== 'DELETE' && data) {
                body = data ? JSON.stringify(data) : undefined;
            }
            let response = await fetch(endpoint, {method, body, headers: {Authorization: `Bearer ${token}`}});
            if (response.status >= 400) {
                let reason = await response.text();
                throw {code: response.status, reason}
            }

            return await response.text();
        }
    };


    this.addProduct = async (gtin, productMessage) => {
        return await _sendRequest(`${BASE_URL}/product/${gtin}`, 'POST', productMessage);
    };

    this.updateProduct = async (gtin, productMessage) => {
        return await _sendRequest(`${BASE_URL}/product/${gtin}`, 'PUT', productMessage);
    };

    this.getProductMetadata = async (gtin) => {
        return await _sendRequest(`${BASE_URL}/product/${gtin}`, 'GET');
    };

    this.addBatch = async (gtin, batchNumber, batchMessage) => {
        return await _sendRequest(`${BASE_URL}/batch/${gtin}/${encodeURIComponent(batchNumber)}`, 'POST', batchMessage);
    };

    this.addAuditLog = async (logType, auditMessage) => {
        return await _sendRequest(`${BASE_URL}/audit/${logType}`, 'POST', auditMessage);
    }

    this.updateBatch = async (gtin, batchNumber, batchMessage) => {
        return await _sendRequest(`${BASE_URL}/batch/${gtin}/${encodeURIComponent(batchNumber)}`, 'PUT', batchMessage);
    };

    this.getBatchMetadata = async (gtin, batchNumber) => {
        return await _sendRequest(`${BASE_URL}/batch/${gtin}/${encodeURIComponent(batchNumber)}`, 'GET');
    };

    this.getProductEPIs = async (gtin, language, epiType, dsuVersion) => {
        let url = `${BASE_URL}/epi/${gtin}/${language}/${epiType}`;
        if (dsuVersion) {
            url = `${url}?version=${dsuVersion}`;
        }

        return await _sendRequest(url, 'GET');
    }

    this.getBatchEPIs = async (gtin, batchNumber, language, epiType, dsuVersion) => {
        let url = `${BASE_URL}/epi/${gtin}/${encodeURIComponent(batchNumber)}/${language}/${epiType}`;
        if (dsuVersion) {
            url = `${url}?version=${dsuVersion}`;
        }

        return await _sendRequest(url, 'GET');
    }

    this.addProductEPI = async (gtin, language, epiType, epiMessage) => {
        return await _sendRequest(`${BASE_URL}/epi/${gtin}/${language}/${epiType}`, 'POST', epiMessage);
    };

    this.addBatchEPI = async (gtin, batchNumber, language, epiType, epiMessage) => {
        return await _sendRequest(`${BASE_URL}/epi/${gtin}/${encodeURIComponent(batchNumber)}/${language}/${epiType}`, 'POST', epiMessage);
    };

    this.updateProductEPI = async (gtin, language, epiType, epiMessage) => {
        return await _sendRequest(`${BASE_URL}/epi/${gtin}/${language}/${epiType}`, 'PUT', epiMessage);
    }

    this.updateBatchEPI = async (gtin, batchNumber, language, epiType, epiMessage) => {
        return await _sendRequest(`${BASE_URL}/epi/${gtin}/${encodeURIComponent(batchNumber)}/${language}/${epiType}`, 'PUT', epiMessage);
    }

    this.deleteProductEPI = async (gtin, language, epiType) => {
        return await _sendRequest(`${BASE_URL}/epi/${gtin}/${language}/${epiType}`, 'DELETE');
    };

    this.deleteBatchEPI = async (gtin, batchNumber, language, epiType) => {
        return await _sendRequest(`${BASE_URL}/epi/${gtin}/${encodeURIComponent(batchNumber)}/${language}/${epiType}`, 'DELETE');
    };

    this.listProductLangs = async (gtin, epiType) => {
        return await _sendRequest(`${BASE_URL}/listProductLangs/${gtin}/${epiType}`, 'GET');
    }

    this.listBatchLangs = async (gtin, batchNumber, epiType) => {
        return await _sendRequest(`${BASE_URL}/listBatchLangs/${gtin}/${encodeURIComponent(batchNumber)}/${epiType}`, 'GET');
    }

    const processParametersAndSendRequest = async (baseURL, endpoint, start, number, query, sort) => {
        if (!query) {
            query = encodeURIComponent("__timestamp > 0");
        }
        let url = `${baseURL}/${endpoint}?query=${encodeURIComponent(query)}`;
        if (typeof start !== 'undefined') {
            url += `&start=${start}`;
        }
        if (typeof number !== 'undefined') {
            url += `&number=${number}`;
        }
        if (typeof sort !== 'undefined') {
            url += `&sort=${sort}`;
        }
        return await _sendRequest(url, 'GET');
    }

    this.listProducts = async (start, number, query, sort) => {
        return await processParametersAndSendRequest(BASE_URL, 'listProducts', start, number, query, sort);
    };

    this.listBatches = async (start, number, query, sort) => {
        return await processParametersAndSendRequest(BASE_URL, 'listBatches', start, number, query, sort);
    };
}

module.exports = SoRClient;