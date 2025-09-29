#!/usr/bin/env node
/**
 * Postmark webhook upsert script
 * Ensures the webhook exists with correct configuration
 */

import fetch from 'node-fetch';

const {
  POSTMARK_SERVER_TOKEN,
  WEBHOOK_URL = 'https://vah-api-staging.onrender.com/api/webhooks-postmark',
  WEBHOOK_USER = '',
  WEBHOOK_PASS = '',
  WEBHOOK_STREAM = 'outbound'
} = process.env;

if (!POSTMARK_SERVER_TOKEN) {
  console.error('❌ POSTMARK_SERVER_TOKEN is required');
  process.exit(1);
}

const API_BASE = 'https://api.postmarkapp.com';

async function getWebhooks() {
  const res = await fetch(`${API_BASE}/webhooks`, {
    headers: {
      'X-Postmark-Server-Token': POSTMARK_SERVER_TOKEN,
      'Accept': 'application/json'
    }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch webhooks: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
}

async function createWebhook() {
  const body = {
    Url: WEBHOOK_URL,
    MessageStream: WEBHOOK_STREAM,
    HttpAuth: WEBHOOK_USER && WEBHOOK_PASS ? {
      Username: WEBHOOK_USER,
      Password: WEBHOOK_PASS
    } : undefined,
    Triggers: {
      Open: true,
      Delivery: true,
      Bounce: true,
      SpamComplaint: true,
      Click: true,
      SubscriptionChange: true
    }
  };

  const res = await fetch(`${API_BASE}/webhooks`, {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': POSTMARK_SERVER_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to create webhook: ${res.status} ${res.statusText} - ${error}`);
  }

  return res.json();
}

async function updateWebhook(webhookId) {
  const body = {
    Url: WEBHOOK_URL,
    MessageStream: WEBHOOK_STREAM,
    HttpAuth: WEBHOOK_USER && WEBHOOK_PASS ? {
      Username: WEBHOOK_USER,
      Password: WEBHOOK_PASS
    } : undefined,
    Triggers: {
      Open: true,
      Delivery: true,
      Bounce: true,
      SpamComplaint: true,
      Click: true,
      SubscriptionChange: true
    }
  };

  const res = await fetch(`${API_BASE}/webhooks/${webhookId}`, {
    method: 'PUT',
    headers: {
      'X-Postmark-Server-Token': POSTMARK_SERVER_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to update webhook: ${res.status} ${res.statusText} - ${error}`);
  }

  return res.json();
}

async function main() {
  try {
    console.log('🔍 Checking existing webhooks...');
    const webhooks = await getWebhooks();
    
    const existingWebhook = webhooks.Webhooks?.find(w => w.Url === WEBHOOK_URL);
    
    if (existingWebhook) {
      console.log(`📝 Found existing webhook (ID: ${existingWebhook.ID})`);
      console.log('🔄 Updating webhook configuration...');
      await updateWebhook(existingWebhook.ID);
      console.log('✅ Webhook updated successfully');
    } else {
      console.log('➕ Creating new webhook...');
      const newWebhook = await createWebhook();
      console.log(`✅ Webhook created successfully (ID: ${newWebhook.ID})`);
    }
    
    console.log(`🎯 Webhook URL: ${WEBHOOK_URL}`);
    console.log(`📡 Stream: ${WEBHOOK_STREAM}`);
    if (WEBHOOK_USER && WEBHOOK_PASS) {
      console.log(`🔐 Auth: ${WEBHOOK_USER}:***`);
    } else {
      console.log('🔓 No authentication configured');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
