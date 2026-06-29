import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm, copyFile, mkdir } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "bot/index.js")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outdir: distDir,
    outExtension: { ".js": ".cjs" },
    logLevel: "info",
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    define: {
      "import.meta.url": "__importMetaUrl",
    },
    banner: {
      js: `'use strict';\nconst __importMetaUrl = require('url').pathToFileURL(__filename).href;`,
    },
  });

  // Copy static assets needed at runtime
  // schema.sql: connect.js reads join(__dirname, 'schema.sql')
  // bundled __dirname = dist/, so it must be at dist/schema.sql
  await copyFile(
    path.resolve(artifactDir, "bot/database/schema.sql"),
    path.resolve(distDir, "schema.sql")
  );

  // logo.png & banner.png: handlers read join(__dirname, '../assets/logo.png')
  // bundled __dirname = dist/, so assets must be at dist/../assets/ = artifacts/api-server/assets/
  const assetsDir = path.resolve(distDir, "../assets");
  await mkdir(assetsDir, { recursive: true });
  await copyFile(
    path.resolve(artifactDir, "bot/assets/logo.png"),
    path.resolve(assetsDir, "logo.png")
  );
  await copyFile(
    path.resolve(artifactDir, "bot/assets/banner.png"),
    path.resolve(assetsDir, "banner.png")
  );

  console.log("✅ Build CJS terminé — dist/index.js prêt pour Passenger/Plesk");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
