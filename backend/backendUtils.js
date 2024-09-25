function generateRandomGTIN14() {
    // Generate the first 13 digits randomly
    let gtinValue = '';
    for (let i = 0; i < 13; i++) {
        gtinValue += Math.floor(Math.random() * 10).toString();
    }

    // Calculate the check digit
    const gtinMultiplicationArray = [3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];

    let gtinDigits = gtinValue.split("");


    let j = gtinMultiplicationArray.length - 1;
    let reszultSum = 0;
    for (let i = gtinDigits.length - 1; i >= 0; i--) {
        reszultSum = reszultSum + gtinDigits[i] * gtinMultiplicationArray[j];
        j--;
    }
    let validDigit = Math.floor((reszultSum + 10) / 10) * 10 - reszultSum;
    if (validDigit === 10) {
        validDigit = 0;
    }

    gtinValue += validDigit;
    return gtinValue;
}

function generateRandomBatchNumber(length = 10) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const convertLeafletFolderToObject = (folderPath) => {
    const leafletObject = {
        "messageTypeVersion": 1,
        "senderId": "devuser",
        "receiverId": "",
        "messageId": "6628938783353",
        "messageDateTime": "2022-06-29T09:40:15.583Z",
        "messageType": "leaflet",
        "payload": {
            "status": "new",
            "language": "en",
            "xmlFileContent": "",
            "otherFilesContent": []
        }
    }

    const fs = require('fs');
    const path = require('path');
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const fileData = fs.readFileSync(filePath);
        // if file is xml update xmlFileContent else add to otherFileContent
        if (file.endsWith('.xml')) {
            leafletObject.payload.xmlFileContent = fileData.toString('base64');
        } else {
            leafletObject.payload.otherFilesContent.push({
                "filename": file,
                "fileContent": fileData.toString('base64')
            });
        }
    }
    return leafletObject;
}

module.exports = {
    generateRandomGTIN14,
    generateRandomBatchNumber,
    convertLeafletFolderToObject
}