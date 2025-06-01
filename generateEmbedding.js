// const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

const IMAGE_URLS = [
    "https://i.postimg.cc/BvP1gPQc/bag1.jpg",
    "https://i.postimg.cc/pTN51VmN/bag2.jpg",
    "https://i.postimg.cc/sxmBXpwy/shoe1.webp",
    "https://i.postimg.cc/FsFd6BHK/shoe2.webp",
    "https://i.postimg.cc/xTsJV3X3/sunglass1.jpg",
    "https://i.postimg.cc/vZc1Yx9F/sunglass2.jpg",
    "https://i.postimg.cc/GhS253fM/tshirt1.jpg",
    "https://i.postimg.cc/nhjzbbbn/tshirt2.jpg",
    "https://i.postimg.cc/k5WgGQgZ/watch1.jpg",
    "https://i.postimg.cc/501NCXHt/watch2.jpg",
];

const headers = {
    'Authorization': `Token ${REPLICATE_TOKEN}`,
    'Content-Type': 'application/json'
};

async function generateEmbedding(imageUrl) {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            version: '1c0371070cb827ec3c7f2f28adcdde54b50dcd239aa6faea0bc98b174ef03fb4', // krthr/clip-embeddings
            input: { image: imageUrl }
        })
    });

    const prediction = await response.json();
    const getUrl = prediction.urls.get;

    // Wait until it's done
    let output;
    while (true) {
        const result = await fetch(getUrl, { headers });
        const data = await result.json();
        if (data.status === 'succeeded') {
            output = data.output;
            break;
        } else if (data.status === 'failed') {
            throw new Error('Embedding failed');
        }
        await new Promise(r => setTimeout(r, 1000)); // wait 1s
    }

    return output.embedding;
}

(async () => {
    const allEmbeddings = [];

    for (let i = 0; i < IMAGE_URLS.length; i++) {
        console.log(`Processing ${IMAGE_URLS[i]}...`);
        const embedding = await generateEmbedding(IMAGE_URLS[i]);
        allEmbeddings.push({ image: IMAGE_URLS[i], embedding });
    }

    fs.writeFileSync('embeddings.json', JSON.stringify(allEmbeddings, null, 2));
    console.log('Done! Saved embeddings.json');
})();
