// Sample JavaScript file for testing AST analysis
const express = require('express');
const lodash = require('lodash');
const moment = require('moment');
const axios = require('axios');

class APIController {
  constructor() {
    this.app = express();
    this.routes = [];
  }

  setupRoutes() {
    // Using vulnerable lodash functions
    this.app.get('/users', (req, res) => {
      const data = lodash.merge({}, req.query);
      const filtered = lodash.pick(data, ['name', 'email']);
      res.json(filtered);
    });

    // Using moment for date handling
    this.app.get('/dates', (req, res) => {
      const now = moment();
      const formatted = now.format('YYYY-MM-DD');
      res.json({ date: formatted });
    });

    // Using axios for HTTP requests
    this.app.post('/proxy', async (req, res) => {
      try {
        const response = await axios.post('https://api.example.com', req.body);
        res.json(response.data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  start(port = 3000) {
    this.setupRoutes();
    this.app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
}

// Export functions
function processUserData(userData) {
  return lodash.cloneDeep(userData);
}

function validateDate(dateString) {
  return moment(dateString).isValid();
}

module.exports = {
  APIController,
  processUserData,
  validateDate
};