const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Utility: Cosine similarity
function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dot / (magA * magB);
}

// Load product embeddings once
const products = require('./products.json');

app.post('/search-by-image', upload.single('image'), async (req, res) => {
    const imagePath = req.file.path;

    try {
        const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });

        // Request embedding from Replicate
        const response = await axios.post(
            'https://api.replicate.com/v1/predictions',
            {
                version: process.env.REPLICATE_MODEL_VERSION, // krthr/clip-embeddings
                input: { image: `data:image/jpeg;base64,${base64Image}` }
            },
            {
                headers: {
                    'Authorization': `Token r8_HE7msuwrOhoEKGL0FyyMrdtt88WhO7T2EAPs2`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Poll until output is ready
        let result;
        let prediction = response.data;
        const predictionId = prediction.id;

        while (!result) {
            const poll = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: { 'Authorization': `Token r8_HE7msuwrOhoEKGL0FyyMrdtt88WhO7T2EAPs2` }
            });

            if (poll.data.status === 'succeeded') {
                result = poll.data.output;
                break;
            } else if (poll.data.status === 'failed') {
                throw new Error('Prediction failed');
            }

            await new Promise(r => setTimeout(r, 1000)); // wait 1s
        }

        const imageEmbedding = result.embedding;

        // Compare with product embeddings
        const matches = products.map(product => {
            const score = cosineSimilarity(imageEmbedding, product.embedding);
            return { ...product, similarity: score };
        }).sort((a, b) => b.similarity - a.similarity);

        const topResults = matches.slice(0, 2);

        console.log('Top results:', topResults);

        res.json({ results: topResults });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    } finally {
        fs.unlinkSync(imagePath);
    }
});

app.listen(4000, () => console.log('Server running on http://localhost:4000'));
