/* eslint-disable no-console */
/**
 * Test script to append a row to DestructionLog Excel table in OneDrive
 * Uses Microsoft Graph API with application permissions (client credentials)
 */

import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

// Constants
const DRIVE_ID = "b!snNkppEWaEiyHvpVyV1o4HOJOXZefE9KoU1x1PDktQ6d_XCdwlReQqrdfWVhnFLw";
const FILE_ITEM_ID = "01U3TMRMHWABA4BKQV4FALAYRVR4O4MSQS";
const TABLE_NAME = "DestructionLog";

// Environment variables
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;

if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    console.error("Missing required environment variables:");
    console.error("  AZURE_TENANT_ID:", !!AZURE_TENANT_ID);
    console.error("  AZURE_CLIENT_ID:", !!AZURE_CLIENT_ID);
    console.error("  AZURE_CLIENT_SECRET:", !!AZURE_CLIENT_SECRET);
    process.exit(1);
}

async function appendRowToExcelTable() {
    try {
        // Authenticate using client credentials (application permissions)
        const credential = new ClientSecretCredential(
            AZURE_TENANT_ID!,
            AZURE_CLIENT_ID!,
            AZURE_CLIENT_SECRET!
        );

        const authProvider = new TokenCredentialAuthenticationProvider(credential, {
            scopes: ["https://graph.microsoft.com/.default"],
        });

        const client = Client.initWithMiddleware({ authProvider });

        // Build the row data
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const rowData = {
            values: [
                [
                    today, // destruction_date
                    "MAIL-12345", // mail_item_id
                    "Cross-cut shredder", // method
                    "System", // authorised_by
                    "Automated Job", // performed_by
                    "GDPR + HMRC AML", // retention_basis
                    "Automated test entry", // notes
                ],
            ],
        };

        console.log("[testDestructionLogWrite] Authenticating to Microsoft Graph...");
        console.log("[testDestructionLogWrite] Appending row to table:", TABLE_NAME);
        console.log("[testDestructionLogWrite] Row data:", JSON.stringify(rowData, null, 2));

        // Append row to Excel table
        // API endpoint: /drives/{drive-id}/items/{item-id}/workbook/tables/{table-name}/rows/add
        const response = await client
            .api(`/drives/${DRIVE_ID}/items/${FILE_ITEM_ID}/workbook/tables/${TABLE_NAME}/rows/add`)
            .post(rowData);

        console.log("[testDestructionLogWrite] ✅ Success! Row appended to Excel table");
        console.log("[testDestructionLogWrite] Response:", JSON.stringify(response, null, 2));
    } catch (error: any) {
        console.error("[testDestructionLogWrite] ❌ Error:", error);
        if (error.response) {
            console.error("[testDestructionLogWrite] Response status:", error.response.status);
            console.error("[testDestructionLogWrite] Response body:", await error.response.text());
        }
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    appendRowToExcelTable()
        .then(() => {
            console.log("[testDestructionLogWrite] Script completed successfully");
            process.exit(0);
        })
        .catch((error) => {
            console.error("[testDestructionLogWrite] Script failed:", error);
            process.exit(1);
        });
}

export { appendRowToExcelTable };

