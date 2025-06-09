import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";
import { z } from "zod";

export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Github Tools",
		version: "1.0.0",
	});

	async init() {
		this.server.tool(
			"github_issues",
			{
				repo: z.string(),
				status: z.enum(['open', 'closed', 'all']).optional(),
				count: z.number().optional(),
			},
			async ({ repo, status = 'open', count = 10 }) => {
				const res = await axios.get<Array<{
					 number: number,
					title: string,
					html_url: string,
				}>>(`https://api.github.com/repos/${repo}/issues?state=${status}&per_page=${count}`, {
					headers: { 'User-Agent': 'mcp-lambda-agent' }
				});
	
				const issues = res.data.map(issue => ({
					number: issue.number,
					title: issue.title,
					url: issue.html_url
				}));

				const formattedText = issues.map(issue => 
					`• #${issue.number}: ${issue.title}\n  ${issue.url}`
				).join('\n\n');

				return {
					content: [{ type: "text", text: formattedText }],
				};
			}
		);

		this.server.tool(
			"github_pull_requests",
			{ 
				repo: z.string(), 
				status: z.enum(['open', 'closed', 'all']).optional(),
				count: z.number().optional()
			},
			async ({ repo, status = 'open', count = 10 }) => {
				const res = await axios.get<Array<{
					number: number,
					title: string,
					html_url: string,
					user: { login: string },
					created_at: string,
					updated_at: string
				}>>(`https://api.github.com/repos/${repo}/pulls?state=${status}&per_page=${count}`, {
					headers: { 'User-Agent': 'mcp-lambda-agent' }
				});

				const prs = res.data.map(pr => ({
					number: pr.number,
					title: pr.title,
					url: pr.html_url,
					author: pr.user.login,
					created: new Date(pr.created_at).toLocaleDateString(),
					updated: new Date(pr.updated_at).toLocaleDateString()
				}));

				const formattedText = prs.map(pr => 
					`• #${pr.number}: ${pr.title}\n` +
					`  By: ${pr.author} | Created: ${pr.created} | Updated: ${pr.updated}\n` +
					`  ${pr.url}`
				).join('\n\n');

				return {
					content: [{ type: "text", text: formattedText }],
				};
			}
		);

		this.server.tool(
			"github_repo_stats",
			{ repo: z.string() },
			async ({ repo }) => {
				const [repoRes, languagesRes] = await Promise.all([
					axios.get<{
						stargazers_count: number,
						forks_count: number,
						watchers_count: number,
						open_issues_count: number,
						subscribers_count: number,
						network_count: number,
						default_branch: string,
						created_at: string,
						updated_at: string,
						description: string
					}>(`https://api.github.com/repos/${repo}`, {
						headers: { 'User-Agent': 'mcp-lambda-agent' }
					}),
					axios.get<Record<string, number>>(`https://api.github.com/repos/${repo}/languages`, {
						headers: { 'User-Agent': 'mcp-lambda-agent' }
					})
				]);

				const repoData = repoRes.data;
				const languages = Object.entries(languagesRes.data)
					.sort(([, a], [, b]) => b - a)
					.slice(0, 5)
					.map(([lang, bytes]) => `${lang}: ${(bytes / 1024).toFixed(1)}KB`)
					.join(', ');

				const formattedText = 
					`Repository: ${repo}\n` +
					`Description: ${repoData.description || 'No description provided'}\n\n` +
					`📊 Statistics:\n` +
					`• Stars: ${repoData.stargazers_count}\n` +
					`• Forks: ${repoData.forks_count}\n` +
					`• Watchers: ${repoData.watchers_count}\n` +
					`• Open Issues: ${repoData.open_issues_count}\n` +
					`• Subscribers: ${repoData.subscribers_count}\n` +
					`• Network Size: ${repoData.network_count}\n\n` +
					`🔧 Technical Details:\n` +
					`• Default Branch: ${repoData.default_branch}\n` +
					`• Top Languages: ${languages}\n` +
					`• Created: ${new Date(repoData.created_at).toLocaleDateString()}\n` +
					`• Last Updated: ${new Date(repoData.updated_at).toLocaleDateString()}`;

				return {
					content: [{ type: "text", text: formattedText }],
				};
			}
		);

		this.server.tool(
			"calculator",
			{
				operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
				a: z.number(),
				b: z.number()
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case 'add':
						result = a + b;
						break;
					case 'subtract':
						result = a - b;
						break;
					case 'multiply':
						result = a * b;
						break;
					case 'divide':
						if (b === 0) throw new Error('Division by zero');
						result = a / b;
						break;
				}

				return {
					content: [{ 
						type: "text", 
						text: `${a} ${operation} ${b} = ${result}` 
					}],
				};
			}
		);

		this.server.tool(
			"shorten_url",
			{
				url: z.string().url(),
				customAlias: z.string().min(3).max(20).optional()
			},
			async ({ url, customAlias }) => {
				const mockShortUrl = customAlias 
					? `https://short.url/${customAlias}`
					: `https://short.url/${Math.random().toString(36).substr(2, 6)}`;

				return {
					content: [{ 
						type: "text", 
						text: `Original URL: ${url}\nShortened URL: ${mockShortUrl}` 
					}],
				};
			}
		);

		this.server.tool(
			"weather_lookup",
			{
				city: z.string(),
				country: z.string().length(2)
			},
			async ({ city, country }) => {
				const mockWeather = {
					temperature: Math.floor(Math.random() * 30) + 10,
					condition: ['Sunny', 'Cloudy', 'Rainy', 'Windy'][Math.floor(Math.random() * 4)],
					humidity: Math.floor(Math.random() * 50) + 30
				};

				return {
					content: [{ 
						type: "text", 
						text: `Weather in ${city}, ${country}:\n` +
							`Temperature: ${mockWeather.temperature}°C\n` +
							`Condition: ${mockWeather.condition}\n` +
							`Humidity: ${mockWeather.humidity}%` 
					}],
				};
			}
		);

		this.server.tool(
			"nestjs_sentry_scaffold",
			{},
			async () => {
				const steps = [
					{
						type: "text" as const,
						text: "To scaffold a NestJS project with Sentry integration, follow these steps:"
					},
					{
						type: "text" as const,
						text: "1. Create the following files:\n\nsrc/interceptors/sentry.interceptor.ts:\n```typescript\n" +
							"import {\n  ExecutionContext,\n  CallHandler,\n  NestInterceptor,\n  Injectable,\n} from '@nestjs/common';\n" +
							"import * as Sentry from '@sentry/node';\nimport { Observable } from 'rxjs';\nimport { tap } from 'rxjs/operators';\n\n" +
							"@Injectable()\nexport class SentryInterceptor implements NestInterceptor {\n  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {\n" +
							"    return next.handle().pipe(\n      tap({\n        error: (exception) => {\n          Sentry.captureException(exception);\n        },\n      }),\n    );\n  }\n}\n```"
					},
					{
						type: "text" as const,
						text: "src/main.ts:\n```typescript\nimport { NestFactory } from '@nestjs/core';\nimport { AppModule } from './app.module';\n" +
							"import * as Sentry from '@sentry/node';\nimport { SentryInterceptor } from './interceptors/sentry.interceptor';\n\n" +
							"async function bootstrap() {\n  // Initialize Sentry\n  Sentry.init({\n    dsn: process.env.SENTRY_DSN,\n" +
							"    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring\n    tracesSampleRate: 1.0,\n  });\n\n" +
							"  const app = await NestFactory.create(AppModule);\n  app.useGlobalInterceptors(new SentryInterceptor());\n  await app.listen(3000);\n}\nbootstrap();\n```"
					},
					{
						type: "text" as const,
						text: "src/app.module.ts:\n```typescript\nimport { Module } from '@nestjs/common';\nimport { ConfigModule } from '@nestjs/config';\n" +
							"import { AppController } from './app.controller';\nimport { AppService } from './app.service';\n\n@Module({\n  imports: [\n" +
							"    ConfigModule.forRoot({\n      isGlobal: true,\n    }),\n  ],\n  controllers: [AppController],\n  providers: [AppService],\n})\n" +
							"export class AppModule {}\n```"
					},
					{
						type: "text" as const,
						text: ".env:\n```\nSENTRY_DSN=your-sentry-dsn-here\n```"
					},
					{
						type: "text" as const,
						text: "2. Install dependencies in the NestJS root folder:\n```bash\nnpm install --save @nestjs/config @sentry/node dotenv\n```"
					},
					{
						type: "text" as const,
						text: "3. Replace the SENTRY_DSN value in .env with your actual Sentry DSN"
					},
					{
						type: "text" as const,
						text: "4. Start the application:\n```bash\nnpm run start:dev\n```"
					}
				];

				return {
					content: steps
				};
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
