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

// Only exit if called directly (not when imported as a module)
if (require.main === module) {
    if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
        console.error("Missing required environment variables:");
        console.error("  AZURE_TENANT_ID:", !!AZURE_TENANT_ID);
        console.error("  AZURE_CLIENT_ID:", !!AZURE_CLIENT_ID);
        console.error("  AZURE_CLIENT_SECRET:", !!AZURE_CLIENT_SECRET);
        process.exit(1);
    }
}

async function appendRowToExcelTable() {
    // Check environment variables at runtime (when called as a function)
    if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
        throw new Error("Missing required environment variables: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET");
    }

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

        // Build the row data to match the actual Excel table structure:
        // Column A: Column1 (likely destruction date or index)
        // Column B: Mail Item ID
        // Column C: Customer Name / ID
        // Column D: Mail Description
        // Column E: Receipt Date
        // Column F: Eligibility Date
        // Column G: Destruction Method
        // Column H: Staff Name
        // Column I: Staff Signature / Initials
        // Column J: Notes
        const today = new Date();
        const todayFormatted = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const receiptDate = new Date(today.getTime() - (35 * 24 * 60 * 60 * 1000)); // 35 days ago
        const receiptDateFormatted = receiptDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const eligibilityDate = new Date(receiptDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days after receipt
        const eligibilityDateFormatted = eligibilityDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        const rowData = {
            values: [
                [
                    todayFormatted, // Column A: Column1 (Physical Destruction Date)
                    12345, // Column B: Mail Item ID
                    "Test Customer (ID: 999)", // Column C: Customer Name / ID
                    "Test Mail Subject – Test Sender", // Column D: Mail Description
                    receiptDateFormatted, // Column E: Receipt Date (DD/MM/YYYY)
                    eligibilityDateFormatted, // Column F: Eligibility Date (DD/MM/YYYY)
                    "Cross-cut shredder", // Column G: Destruction Method
                    "Test Admin", // Column H: Staff Name
                    "TA", // Column I: Staff Signature / Initials
                    "Automated test entry", // Column J: Notes
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
        
        return {
            success: true,
            message: "Row appended to Excel table successfully",
            response
        };
    } catch (error: any) {
        console.error("[testDestructionLogWrite] ❌ Error:", error);
        if (error.response) {
            const errorText = await error.response.text().catch(() => 'Unable to read error response');
            console.error("[testDestructionLogWrite] Response status:", error.response.status);
            console.error("[testDestructionLogWrite] Response body:", errorText);
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

