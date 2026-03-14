const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// API endpoint to save cookies
app.post('/api/save-cookies', (req, res) => {
    try {
        const { ak_bmsc } = req.body;
        
        if (!ak_bmsc || typeof ak_bmsc !== 'string') {
            return res.status(400).json({ error: 'Invalid ak_bmsc cookie data' });
        }
        
        // Always set justiceGovAgeVerified to true as required
        const justiceGovAgeVerified = 'true';
        
        // Create the combined cookie string
        const cookies = `ak_bmsc=${ak_bmsc}; justiceGovAgeVerified=${justiceGovAgeVerified}`;
        
        // Read existing .env file or create new one
        const envFilePath = path.resolve(__dirname, '../../.env');
        let envContent = '';
        
        if (fs.existsSync(envFilePath)) {
            envContent = fs.readFileSync(envFilePath, 'utf8');
        }
        
        // Remove existing DOJ_COOKIES line if present
        const lines = envContent.split('\n').filter(line => !line.startsWith('DOJ_COOKIES='));
        
        // Add new DOJ_COOKIES line
        lines.push(`DOJ_COOKIES=${cookies}`);
        
        // Write back to .env file
        fs.writeFileSync(envFilePath, lines.join('\n') + '\n', 'utf8');
        
        // Reload environment variables for current process
        process.env.DOJ_COOKIES = cookies;
        
        res.json({ success: true, message: 'Cookies saved successfully' });
    } catch (error) {
        console.error('Error saving cookies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Web interface running at http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop the server`);
});

module.exports = app;