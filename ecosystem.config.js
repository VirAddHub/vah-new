module.exports = {
    apps: [{
        name: 'vah',
        script: 'server.js',
        instances: 1, // SQLite requires single instance
        exec_mode: 'fork',
        env: {
            NODE_ENV: 'development',
            DEV_MODE: '1'
        },
        env_production: {
            NODE_ENV: 'production',
            DEV_MODE: '0'
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true,
        max_memory_restart: '1G',
        restart_delay: 3000,
        max_restarts: 10,
        min_uptime: '10s'
    }]
};
