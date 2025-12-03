import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle("OverGuild API")
    .setDescription("GameFi Backend for OverGuild - Social Farming & Missions")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth"
    )
    .addTag("Auth", "Wallet authentication & login")
    .addTag("User", "User profile management")
    .addTag("Inventory", "Inventory management - view, add, remove, transfer items")
    .addTag("Land", "Land/Garden management (deprecated)")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Use custom Swagger options for Vercel compatibility
  SwaggerModule.setup("api", app, document, {
    customSiteTitle: "OverGuild API Docs",
    customfavIcon: "https://nestjs.com/img/logo-small.svg",
    customCss: ".swagger-ui .topbar { display: none }",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
    // Force use of CDN assets instead of local files
    customCssUrl: [
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    ],
    customJs: [
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js",
    ],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api`);
}
void bootstrap();
