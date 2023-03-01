import axios from 'axios';

export const uploadCube = async (cubes, images, cubeId) => {
    const JSONBody = {
        cubeId: cubeId,
        cubes: cubes,
        images: images,
        version: 0,
        cubeSize: 2,
    };
    const response = await axios.post(`https://api.pinata.cloud/pinning/pinJSONToIPFS`, JSONBody, {
        maxBodyLength: 'Infinity', //this is needed to prevent axios from erroring out with large files
        headers: {
            pinata_api_key: process.env.REACT_APP_PINATA_API_KEY,
            pinata_secret_api_key: process.env.REACT_APP_PINATA_SECRET_API_KEY,
        },
    });
    console.log(response);
    const ipfsUrl = 'ipfs://' + response.data.IpfsHash;
    return ipfsUrl;
};

// export const uploadCube = async (cubes, cubeId) => {
//     const JSONBody = {
//         cubeId: cubeId,
//         cubes: cubes,
//         images: images,
//         version: 0,
//         cubeSize: 2,
//     };

//     const response = await axios.post("http://localhost:8181/ipfs/upload",
//         {
//             json: JSONBody,
//             token_id: cubeId,
//         }
//     );
//     console.log(response);
// }
