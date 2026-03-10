const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../../database/postgis');

const JWT_SECRET = process.env.JWT_SECRET || 'change in prod';

//Middleware to verify JWT token and attach userId to req
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer')) return res.status(401).json({ error: 'No Token Provided'});
    try {
        req.user = jwt.verify(header.substring(7), JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid Token'});
    }
}

// GET /api/settings
// Returns merged settings: global defaults overridden by user's personal settings
router.get('/', requireAuth, async (req, res) => {
    try {
        const globalResult = await db.query(
            'SELECT key, value FROM global_settings'
        );
        const global = globalResult.rows.reduce((acc, row) => {
            
        })
    }
});