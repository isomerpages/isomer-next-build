const fs = require("fs").promises;
const path = require("path");

const schemaDirPath = path.join(__dirname, "../schema");
const sitemapPath = path.join(__dirname, "../sitemap.json");

async function readSchemaJson(filePath) {
  try {
    const schemaContent = await fs.readFile(filePath, "utf8");
    return JSON.parse(schemaContent);
  } catch (error) {
    return null;
  }
}

async function processDirectory(dirPath, relativePath = "") {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let paths = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.name === "index.json") {
      continue;
    }

    if (entry.isDirectory()) {
      const subRelativePath = path.join(relativePath, entry.name);

      // Check if index.json exists
      const indexFilePath = path.join(entryPath, "index.json");
      const indexSchemaData = await readSchemaJson(indexFilePath);

      if (indexSchemaData) {
        const permalink = `/${subRelativePath}`;
        paths.push({
          permalink,
          title: indexSchemaData.page.title || entry.name,
          paths: await processDirectory(entryPath, subRelativePath),
        });
      } else {
        paths.push({
          paths: await processDirectory(entryPath, subRelativePath),
        });
      }
    }

    const schemaData = await readSchemaJson(entryPath);
    if (schemaData) {
      const pageName = entry.name.split(".").slice(0, -1).join(".");
      const permalink = `/${path.join(relativePath, pageName)}`;
      paths.push({
        permalink,
        title:
          schemaData.title ||
          pageName.charAt(0).toUpperCase() + pageName.slice(1),
      });
    }
  }

  // Sort the paths array if needed, for example, by title or permalink
  // paths.sort((a, b) => a.title.localeCompare(b.title));

  return paths;
}

async function generateSitemap() {
  const rootPaths = await processDirectory(schemaDirPath);
  const sitemap = {
    title: "Home",
    permalink: "/",
    paths: rootPaths,
  };

  await fs.writeFile(sitemapPath, JSON.stringify(sitemap, null, 2));
  console.log("Sitemap generated at:", sitemapPath);
}

generateSitemap().catch(console.error);
