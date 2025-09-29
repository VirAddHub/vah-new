// VirtualAddressHub Backend — Updated with new mailer system

require('dotenv').config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    override: true,
});

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Password123!';

const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const joi = require('joi');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const compression = require('compression');
const { body, query, param, validationResult } = require('express-validator');
const morgan = require('morgan');

// Import new mailer system
const { sendTemplateEmail } = require('./src/lib/mailer.ts');
const { Templates } = require('./src/lib/postmark-templates.ts');

const fs = require('fs');
const path = require('path');
fs.mkdirSync(path.join(process.cwd(), 'logs'), { recursive: true });

// ... rest of the server setup code would go here, but I'll focus on the email updates
