'use strict';

const pool = require('../db');
const auth = require('../middleware/auth');
const config = require('../config/releaseWorkflow');

module.exports = require('./governedWorkflow')({ db: pool, auth, config });
