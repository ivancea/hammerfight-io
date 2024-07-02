import express from "express";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const server = createServer(app);
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = join(__dirname, "client");

app.get("/", (req, res) => {
  res.sendFile(join(clientDir, "index.html"));
});

server.listen(80, () => {
  console.log("server running at http://localhost:3000");
});
