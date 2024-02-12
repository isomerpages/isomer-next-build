const fs = require("fs").promises;
const path = require("path");

const schemaDirPath = path.join(__dirname, "../schema");
const sitemapPath = path.join(__dirname, "../sitemap.json");

async function readSchemaJson(dirPath) {
  try {
    const schemaFilePath = path.join(dirPath, "schema.json");
    const schemaContent = await fs.readFile(schemaFilePath, "utf8");
    return JSON.parse(schemaContent);
  } catch (error) {
    return null;
  }
}

async function processDirectory(dirPath, relativePath = "") {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let paths = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subDirPath = path.join(dirPath, entry.name);
      const subRelativePath = path.join(relativePath, entry.name);
      const schemaData = await readSchemaJson(subDirPath);
      if (schemaData) {
        const permalink = schemaData.permalink || `/${subRelativePath}`;
        paths.push({
          permalink,
          title: schemaData.title || entry.name,
          paths: await processDirectory(subDirPath, subRelativePath),
        });
      } else {
        paths.push({
          permalink: `/${subRelativePath}`,
          title: entry.name,
          paths: await processDirectory(subDirPath, subRelativePath),
        });
      }
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
