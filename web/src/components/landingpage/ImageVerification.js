import AWS from 'aws-sdk';

/*const REGION = 'eu-north-1';
const ACCESS_KEY_ID = '';
const SECRET_ACCESS_KEY = '';

AWS.config.update({
    region: REGION,
    credentials: new AWS.Credentials(ACCESS_KEY_ID, SECRET_ACCESS_KEY)
});*/

const rekognition = new AWS.Rekognition();

export const verifyImage = async (file) => {
    try{
        const arrayBuffer = await file.arrayBuffer();

        const params = {
            Image: {
                Bytes: arrayBuffer
            },
            Attributes: ['ALL']
        };

        const data = await rekognition.detectModerationLabels(params).promise();
        return data;
    }
    catch(error){
        console.error('Error verifying image:', error);
        throw error;
    }
};