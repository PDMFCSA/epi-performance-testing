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

module.exports = {
    getAccessToken
}
