// src/swagger.ts
// OpenAPI/Swagger documentation configuration

import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VirtualAddressHub API',
      version: '1.0.0',
      description: 'API documentation for VirtualAddressHub - Virtual business address service',
      contact: {
        name: 'API Support',
        email: 'support@virtualaddresshub.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://vah-api-staging.onrender.com',
        description: 'Staging server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['ok', 'error', 'message'],
          properties: {
            ok: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'invalid_input',
            },
            message: {
              type: 'string',
              example: 'The provided input is invalid',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          required: ['ok', 'data'],
          properties: {
            ok: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          required: ['ok', 'data', 'total'],
          properties: {
            ok: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            total: {
              type: 'integer',
              example: 100,
            },
            page: {
              type: 'integer',
              example: 1,
            },
            pageSize: {
              type: 'integer',
              example: 20,
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            first_name: {
              type: 'string',
              example: 'John',
            },
            last_name: {
              type: 'string',
              example: 'Doe',
            },
            phone: {
              type: 'string',
              example: '+44 20 1234 5678',
            },
            plan_id: {
              type: 'integer',
              example: 1,
            },
            plan_status: {
              type: 'string',
              enum: ['active', 'inactive', 'cancelled'],
              example: 'active',
            },
            kyc_status: {
              type: 'string',
              enum: ['not_started', 'pending', 'approved', 'rejected'],
              example: 'approved',
            },
            created_at: {
              type: 'integer',
              format: 'int64',
              example: 1704067200000,
            },
          },
        },
        MailItem: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            user_id: {
              type: 'integer',
              example: 1,
            },
            sender_name: {
              type: 'string',
              example: 'HMRC',
            },
            description: {
              type: 'string',
              example: 'Tax document',
            },
            status: {
              type: 'string',
              enum: ['received', 'scanned', 'forwarded', 'archived'],
              example: 'scanned',
            },
            forwarding_status: {
              type: 'string',
              example: 'Requested',
            },
            scan_url: {
              type: 'string',
              example: 'https://storage.example.com/scans/123.pdf',
            },
            created_at: {
              type: 'integer',
              format: 'int64',
              example: 1704067200000,
            },
          },
        },
        ForwardingRequest: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            user_id: {
              type: 'integer',
              example: 1,
            },
            mail_item_id: {
              type: 'integer',
              example: 1,
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected', 'completed'],
              example: 'pending',
            },
            created_at: {
              type: 'integer',
              format: 'int64',
              example: 1704067200000,
            },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            user_id: {
              type: 'integer',
              example: 1,
            },
            amount: {
              type: 'number',
              format: 'float',
              example: 29.99,
            },
            currency: {
              type: 'string',
              example: 'GBP',
            },
            status: {
              type: 'string',
              enum: ['pending', 'paid', 'overdue', 'cancelled'],
              example: 'paid',
            },
            invoice_number: {
              type: 'string',
              example: 'INV-001',
            },
            created_at: {
              type: 'integer',
              format: 'int64',
              example: 1704067200000,
            },
          },
        },
        SupportTicket: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            user_id: {
              type: 'integer',
              example: 1,
            },
            subject: {
              type: 'string',
              example: 'Question about forwarding',
            },
            message: {
              type: 'string',
              example: 'How long does forwarding take?',
            },
            status: {
              type: 'string',
              enum: ['open', 'closed'],
              example: 'open',
            },
            created_at: {
              type: 'integer',
              format: 'int64',
              example: 1704067200000,
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Profile',
        description: 'User profile management',
      },
      {
        name: 'Mail',
        description: 'Mail items management',
      },
      {
        name: 'Forwarding',
        description: 'Mail forwarding requests',
      },
      {
        name: 'Billing',
        description: 'Billing and invoices',
      },
      {
        name: 'Support',
        description: 'Support tickets',
      },
      {
        name: 'Admin',
        description: 'Admin-only endpoints',
      },
    ],
  },
  apis: [
    './src/server/routes/*.ts',
    './src/server/routes/**/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
