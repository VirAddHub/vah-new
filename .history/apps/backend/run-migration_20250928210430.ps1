# Set environment variable and run migration
$env:DATABASE_URL = 'postgresql://vah_postgres_40zq_user:uTRWGQlKebPeTjsEwvYb6rAw8YMNbLZX@dpg-d3coq7l6ubrc73f0bt3g-a.frankfurt-postgres.render.com/vah_postgres_40zq'

Write-Host "Using DATABASE_URL host: $($env:DATABASE_URL -replace '.*@([^:/?]+).*', '$1')"

Write-Host "Running migrations..."
npm run migrate

Write-Host "Running soft delete migration..."
npm run migrate:soft-delete

Write-Host "Seeding database..."
npm run seed

Write-Host "✅ Migrations completed successfully!"
