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
        console.log("[testDestructionLogWrite] Using Drive ID:", DRIVE_ID);
        console.log("[testDestructionLogWrite] Using File Item ID:", FILE_ITEM_ID);
        console.log("[testDestructionLogWrite] Using Table Name:", TABLE_NAME);

        // CRITICAL: Initialize workbook mode before any workbook operations
        // Graph needs to open the file as an Excel workbook, not just a file
        // This must be done before any /workbook/* operations
        console.log("[testDestructionLogWrite] Step 1: Initializing workbook...");
        
        // Try multiple initialization approaches for SharePoint/OneDrive compatibility
        const initUrls = [
            `/drives/${DRIVE_ID}/items/${FILE_ITEM_ID}/workbook/worksheets`,
            `/drives/${DRIVE_ID}/items/${FILE_ITEM_ID}/workbook`,
        ];
        
        let initSucceeded = false;
        let lastInitError: any = null;
        
        for (const initUrl of initUrls) {
            console.log("[testDestructionLogWrite] Trying init URL:", initUrl);
            try {
                const initResponse = await client.api(initUrl).get();
                console.log("[testDestructionLogWrite] ✅ Workbook initialized successfully with:", initUrl);
                if (initResponse?.value) {
                    console.log("[testDestructionLogWrite] Worksheets found:", initResponse.value.length);
                }
                initSucceeded = true;
                break;
            } catch (initError: any) {
                console.error("[testDestructionLogWrite] ⚠️ Init failed with", initUrl);
                console.error("[testDestructionLogWrite] Error:", initError?.message);
                lastInitError = initError;
                // Try next URL
            }
        }
        
        if (!initSucceeded) {
            console.error("[testDestructionLogWrite] ❌ All workbook initialization attempts failed!");
            if (lastInitError?.response) {
                const errorText = await lastInitError.response.text().catch(() => 'Unable to read error');
                console.error("[testDestructionLogWrite] Last error response:", errorText);
            }
            throw new Error(`Workbook initialization failed: ${lastInitError?.message || 'Unknown error'}. Cannot proceed with table operations.`);
        }

        // Step 2: Get worksheets first (needed for some operations)
        console.log("[testDestructionLogWrite] Step 2: Getting worksheets...");
        let worksheetId: string | null = null;
        try {
            const worksheetsResponse = await client
                .api(`/drives/${DRIVE_ID}/items/${FILE_ITEM_ID}/workbook/worksheets`)
                .get();
            const worksheets = worksheetsResponse?.value || [];
            console.log("[testDestructionLogWrite] ✅ Found", worksheets.length, "worksheet(s)");
            if (worksheets.length > 0) {
                worksheetId = worksheets[0].id; // Use first worksheet
                console.log("[testDestructionLogWrite] Using worksheet ID:", worksheetId, "Name:", worksheets[0].name);
            }
        } catch (wsError: any) {
            console.error("[testDestructionLogWrite] ⚠️ Failed to get worksheets:", wsError?.message);
            // Continue anyway
        }

        // Step 3: List tables to verify the table exists
        console.log("[testDestructionLogWrite] Step 3: Verifying table exists...");
        const tablesUrl = `/drives/${DRIVE_ID}/items/${FILE_ITEM_ID}/workbook/tables`;
        console.log("[testDestructionLogWrite] Tables URL:", tablesUrl);
        
        try {
            const tablesResponse = await client.api(tablesUrl).get();
            const tables = tablesResponse?.value || [];
            console.log("[testDestructionLogWrite] ✅ Found", tables.length, "table(s)");
            const tableNames = tables.map((t: any) => t.name);
            console.log("[testDestructionLogWrite] Table names:", tableNames);
            
            if (!tableNames.includes(TABLE_NAME)) {
                throw new Error(`Table "${TABLE_NAME}" not found. Available tables: ${tableNames.join(', ')}`);
            }
            
            const targetTable = tables.find((t: any) => t.name === TABLE_NAME);
            if (!targetTable) {
                throw new Error(`Table "${TABLE_NAME}" not found. Available tables: ${tableNames.join(', ')}`);
            }
            
            const tableId = targetTable.id;
            console.log("[testDestructionLogWrite] Target table ID:", tableId);
            console.log("[testDestructionLogWrite] Target table name:", targetTable.name);
            console.log("[testDestructionLogWrite] Target table worksheet:", targetTable.worksheet?.id || 'N/A');
            
            // Step 4: Append row to Excel table using TABLE ID (not name)
            console.log("[testDestructionLogWrite] Step 4: Appending row to table:", TABLE_NAME, "(ID:", tableId, ")");
            console.log("[testDestructionLogWrite] Row data:", JSON.stringify(rowData, null, 2));
            
            // Try both API paths: with and without worksheet
            let response: any = null;
            let lastError: any = null;
            
            // Option 1: Direct table path (preferred)
            const appendUrl1 = `/drives/${DRIVE_ID}/items/${FILE_ITEM_ID}/workbook/tables/${tableId}/rows/add`;
            console.log("[testDestructionLogWrite] Trying append URL (direct):", appendUrl1);
            
            try {
                response = await client.api(appendUrl1).post(rowData);
                console.log("[testDestructionLogWrite] ✅ Success with direct table path!");
            } catch (err1: any) {
                console.error("[testDestructionLogWrite] ❌ Direct path failed:", err1?.message);
                lastError = err1;
                
                // Option 2: Worksheet-based path (fallback)
                if (worksheetId) {
                    const appendUrl2 = `/drives/${DRIVE_ID}/items/${FILE_ITEM_ID}/workbook/worksheets/${worksheetId}/tables/${tableId}/rows/add`;
                    console.log("[testDestructionLogWrite] Trying append URL (worksheet-based):", appendUrl2);
                    try {
                        response = await client.api(appendUrl2).post(rowData);
                        console.log("[testDestructionLogWrite] ✅ Success with worksheet-based path!");
                    } catch (err2: any) {
                        console.error("[testDestructionLogWrite] ❌ Worksheet-based path also failed:", err2?.message);
                        lastError = err2;
                        throw err2;
                    }
                } else {
                    throw err1;
                }
            }

            console.log("[testDestructionLogWrite] ✅ Success! Row appended to Excel table");
            console.log("[testDestructionLogWrite] Response:", JSON.stringify(response, null, 2));

            return {
                success: true,
                message: "Row appended to Excel table successfully",
                response
            };
        } catch (tablesError: any) {
            console.error("[testDestructionLogWrite] ❌ Table verification/append failed!");
            console.error("[testDestructionLogWrite] Error message:", tablesError?.message);
            console.error("[testDestructionLogWrite] Error code:", tablesError?.statusCode || tablesError?.code);
            if (tablesError?.response) {
                const errorText = await tablesError.response.text().catch(() => 'Unable to read error');
                console.error("[testDestructionLogWrite] Error response:", errorText);
            }
            throw new Error(`Table operation failed: ${tablesError?.message || 'Unknown error'}`);
        }
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

