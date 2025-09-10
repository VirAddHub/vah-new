module.exports = {
    apps: [
        { name: "vah-api", script: "server/index.js", env: { NODE_ENV: "production", PORT: 4000 } },
        { name: "vah-web", script: "node_modules/next/dist/bin/next", args: "start -p 3000", env: { NODE_ENV: "production" } }
    ]
}