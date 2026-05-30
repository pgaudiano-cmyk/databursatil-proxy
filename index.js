const express = require("express");
const fetch = require("node-fetch");

const app = express();

const TOKEN = process.env.DATABURSATIL_TOKEN || "4360db54bee4023b05941bd200c520";
const BASE = "https://api.databursatil.com/v2";
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "databursatil-proxy" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

async function forward(endpoint, req, res) {
  try {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (v == null) continue;
      params.set(k, String(v));
    }
    params.set("token", TOKEN);

    const target = `${BASE}/${endpoint}?${params.toString()}`;
    console.log(`[proxy] → ${endpoint}`);

    const upstream = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
      },
    });

    const text = await upstream.text();
    console.log(`[proxy] ← ${endpoint} status=${upstream.status}`);

    res.status(upstream.status);
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    res.send(text);
  } catch (err) {
    console.error(`[proxy] exception on ${endpoint}:`, err);
    res.status(502).json({ error: true, message: "Proxy failure", details: String(err) });
  }
}

app.get("/financieros", (req, res) => forward("financieros", req, res));
app.get("/emisoras", (req, res) => forward("emisoras", req, res));
app.get("/intradia", (req, res) => forward("intradia", req, res));
app.get("/historicos", (req, res) => forward("historicos", req, res));
app.get("/creditos", (req, res) => forward("creditos", req, res));

app.listen(PORT, () => {
  console.log(`[proxy] listening on :${PORT}`);
});
