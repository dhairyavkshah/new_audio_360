import express from "express";
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || appJson.name || "New Audio 360";
  } catch {
    return "New Audio 360";
  }
}

function serveLandingPage(req, res) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  const html = landingPageTemplate.replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

app.get("/", serveLandingPage);
app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));

app.use((req, res) => {
  res.redirect("/");
});

const port = parseInt(process.env.PORT || "5000", 10);
const server = http.createServer(app);

server.listen(
  {
    port,
    host: "0.0.0.0",
  },
  () => {
    console.log(`Native Android project info page serving on port ${port}`);
  }
);
