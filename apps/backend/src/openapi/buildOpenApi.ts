import type express from "express";
import listEndpoints from "express-list-endpoints";

type ListedEndpoint = {
  path: string;
  methods: string[];
};

function toOpenApiPath(expressPath: string): string {
  // Convert Express params `:id` to OpenAPI `{id}`
  return expressPath.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function tagFromPath(p: string): string {
  const clean = p.replace(/^\/+/, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length === 0) return "root";
  if (parts[0] === "api" && parts[1]) return parts[1];
  return parts[0];
}

export function buildOpenApiFromExpressApp(app: express.Express) {
  const endpoints = listEndpoints(app) as ListedEndpoint[];

  const paths: Record<string, any> = {};

  for (const ep of endpoints) {
    const openApiPath = toOpenApiPath(ep.path);
    const tag = tagFromPath(ep.path);
    paths[openApiPath] ??= {};

    for (const method of ep.methods) {
      const m = method.toLowerCase();
      paths[openApiPath][m] = {
        tags: [tag],
        summary: `${method} ${ep.path}`,
        responses: {
          "200": { description: "OK" },
          "400": { description: "Bad Request" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
          "404": { description: "Not Found" },
          "500": { description: "Server Error" },
        },
      };
    }
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "VAH API",
      version: process.env.APP_VERSION || process.env.npm_package_version || "0.0.0",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        cookieAuth: { type: "apiKey", in: "cookie", name: "vah_session" },
        csrfToken: { type: "apiKey", in: "header", name: "X-CSRF-Token" },
      },
    },
    paths,
  };
}


