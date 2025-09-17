/* eslint-disable no-console */
const BASE_URL = 'https://vah-api-staging.onrender.com/api';

// You'll need to set this environment variable with your setup secret
const SETUP_SECRET = process.env.ADMIN_SETUP_SECRET;

if (!SETUP_SECRET) {
    console.error('❌ Please set ADMIN_SETUP_SECRET environment variable');
    console.log('You can find this in your Render service environment variables');
    process.exit(1);
}

const users = [
    {
        email: 'admin@yourdomain.com',
        password: 'CHANGE_ME_AFTER_FIRST_LOGIN',
        first_name: 'Site',
        last_name: 'Admin'
    },
    {
        email: 'worker@yourdomain.com',
        password: 'CHANGE_ME_AFTER_FIRST_LOGIN',
        first_name: 'Ops',
        last_name: 'Worker'
    }
];

async function createUser(user) {
    try {
        const response = await fetch(`${BASE_URL}/create-admin-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-setup-secret': SETUP_SECRET
            },
            body: JSON.stringify(user)
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`✅ Created user: ${user.email}`);
            return true;
        } else if (response.status === 409) {
            console.log(`ℹ️  User already exists: ${user.email}`);
            return true;
        } else {
            console.error(`❌ Failed to create ${user.email}:`, data.error);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error creating ${user.email}:`, error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Creating admin and worker users...');

    for (const user of users) {
        await createUser(user);
    }

    console.log('\n📋 User credentials:');
    console.log('Admin: admin@yourdomain.com / CHANGE_ME_AFTER_FIRST_LOGIN');
    console.log('Worker: worker@yourdomain.com / CHANGE_ME_AFTER_FIRST_LOGIN');
}

main().catch(console.error);
