import { INestApplication } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';

export interface PostmanCollection {
  info: {
    name: string;
    description: string;
    version: string;
  };
  item: PostmanItem[];
  auth?: PostmanAuth;
  variable?: PostmanVariable[];
}

export interface PostmanItem {
  name: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
  response?: PostmanResponse[];
}

export interface PostmanRequest {
  method: string;
  header: PostmanHeader[];
  body?: PostmanBody;
  url: PostmanUrl;
  auth?: PostmanAuth;
}

export interface PostmanHeader {
  key: string;
  value: string;
  type?: string;
}

export interface PostmanBody {
  mode: string;
  raw?: string;
  formdata?: PostmanFormData[];
}

export interface PostmanFormData {
  key: string;
  value: string;
  type: string;
}

export interface PostmanUrl {
  raw: string;
  protocol: string;
  host: string[];
  port?: string;
  path: string[];
  query?: PostmanQuery[];
}

export interface PostmanQuery {
  key: string;
  value: string;
  disabled?: boolean;
}

export interface PostmanResponse {
  name: string;
  status: string;
  code: number;
  header: PostmanHeader[];
  body: string;
}

export interface PostmanAuth {
  type: string;
  bearer?: Array<{ key: string; value: string; type: string }>;
}

export interface PostmanVariable {
  key: string;
  value: string;
  type: string;
}

export class PostmanCollectionGenerator {
  static generate(
    openapi: OpenAPIObject,
    baseUrl: string,
    apiVersion: string,
  ): PostmanCollection {
    const collection: PostmanCollection = {
      info: {
        name: `Nestera API ${apiVersion}`,
        description: openapi.info.description || 'Nestera API Documentation',
        version: apiVersion,
      },
      variable: [
        {
          key: 'baseUrl',
          value: baseUrl,
          type: 'string',
        },
        {
          key: 'token',
          value: 'your_jwt_token_here',
          type: 'string',
        },
      ],
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{token}}',
            type: 'string',
          },
        ],
      },
      item: [],
    };

    if (openapi.paths) {
      const pathGroups: { [key: string]: PostmanItem[] } = {};

      Object.entries(openapi.paths).forEach(
        ([path, pathItem]: [string, any]) => {
          const tag = pathItem.get?.tags?.[0] || 'General';

          if (!pathGroups[tag]) {
            pathGroups[tag] = [];
          }

          Object.entries(pathItem).forEach(
            ([method, operation]: [string, any]) => {
              if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
                const item = this.createPostmanItem(
                  path,
                  method.toUpperCase(),
                  operation,
                );
                pathGroups[tag].push(item);
              }
            },
          );
        },
      );

      Object.entries(pathGroups).forEach(([tag, items]) => {
        collection.item.push({
          name: tag,
          item: items,
        });
      });
    }

    return collection;
  }

  private static createPostmanItem(
    path: string,
    method: string,
    operation: any,
  ): PostmanItem {
    const url = this.parseUrl(path);
    const headers: PostmanHeader[] = [
      { key: 'Content-Type', value: 'application/json' },
    ];

    if (operation.security) {
      headers.push({
        key: 'Authorization',
        value: 'Bearer {{token}}',
      });
    }

    const request: PostmanRequest = {
      method,
      header: headers,
      url,
    };

    if (operation.requestBody) {
      const schema =
        operation.requestBody.content?.['application/json']?.schema;
      if (schema) {
        request.body = {
          mode: 'raw',
          raw: JSON.stringify(this.generateExample(schema), null, 2),
        };
      }
    }

    return {
      name: operation.summary || `${method} ${path}`,
      request,
      response: this.generateResponses(operation),
    };
  }

  private static parseUrl(path: string): PostmanUrl {
    const pathParts = path.split('/').filter((p) => p);
    const query: PostmanQuery[] = [];

    const cleanPath = path.replace(/{([^}]+)}/g, (match, param) => {
      return `:${param}`;
    });

    return {
      raw: `{{baseUrl}}${cleanPath}`,
      protocol: 'https',
      host: ['{{baseUrl}}'],
      path: pathParts.map((p) => p.replace(/{([^}]+)}/g, ':$1')),
      query: query.length > 0 ? query : undefined,
    };
  }

  private static generateExample(schema: any): any {
    if (!schema) return {};

    if (schema.example) return schema.example;
    if (schema.type === 'object') {
      const obj: any = {};
      if (schema.properties) {
        Object.entries(schema.properties).forEach(
          ([key, prop]: [string, any]) => {
            obj[key] = this.generateExample(prop);
          },
        );
      }
      return obj;
    }
    if (schema.type === 'array') {
      return [this.generateExample(schema.items)];
    }
    if (schema.type === 'string') return 'string';
    if (schema.type === 'number') return 0;
    if (schema.type === 'boolean') return true;
    return null;
  }

  private static generateResponses(operation: any): PostmanResponse[] {
    const responses: PostmanResponse[] = [];

    if (operation.responses) {
      Object.entries(operation.responses).forEach(
        ([code, response]: [string, any]) => {
          const schema = response.content?.['application/json']?.schema;
          responses.push({
            name: response.description || `Response ${code}`,
            status: response.description || 'OK',
            code: parseInt(code),
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: JSON.stringify(this.generateExample(schema), null, 2),
          });
        },
      );
    }

    return responses;
  }
}
