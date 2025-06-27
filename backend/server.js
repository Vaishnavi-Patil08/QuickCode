const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Basic Server Setup ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Enable parsing of JSON request bodies

// --- AI Client Initialization ---
if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not defined in the .env file.");
    process.exit(1); // Exit if the API key is missing
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- API Endpoint ---
app.post('/api/analyze', async (req, res) => {
    const { note } = req.body;

    if (!note || typeof note !== 'string' || note.trim().length === 0) {
        return res.status(400).json({ error: 'Clinical note is required and must be a non-empty string.' });
    }

    console.log("Received request to analyze note...");

    // --- Structured Output Prompt for Gemini ---
    const prompt = `
        Analyze the following clinical note.
        1. Extract relevant ICD-10 and CPT codes.
        2. Provide a brief, one-sentence summary of the visit.
        3. For each code, provide a confidence score from 0.0 to 1.0.

        Note:
        ${note}

        Provide the output in a clean JSON format like this, and nothing else:
        {
          "summary": "A one-sentence summary here.",
          "codes": [
            {"code": "E11.9", "type": "ICD-10", "description": "Type 2 diabetes mellitus without complications", "confidence": 0.95},
            {"code": "I10", "type": "ICD-10", "description": "Essential (primary) hypertension", "confidence": 0.90}
          ]
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean the response to ensure it's valid JSON
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        console.log("AI Response received, parsing JSON...");
        const parsedJson = JSON.parse(text);

        // Send the structured data back to the frontend
        res.json(parsedJson);

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        res.status(500).json({ error: 'Failed to process the note with the AI model.' });
    }
});

// --- Start the server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
