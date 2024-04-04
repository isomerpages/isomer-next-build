const fs = require("fs").promises;
const _path = require("path");

const schemaDirPath = _path.join(__dirname, "../schema");
const sitemapPath = _path.join(__dirname, "../sitemap.json");

async function readSchemaJson(filePath) {
  try {
    const schemaContent = await fs.readFile(filePath, "utf8");
    return JSON.parse(schemaContent);
  } catch (error) {
    return null;
  }
}

async function processFile(fullPath, relativePath, name) {
  const schemaPath = _path.join(fullPath, name);
  const schemaData = await readSchemaJson(schemaPath);
  if (!schemaData) {
    return null;
  }
  const pageName = name.split(".")[0];
  const permalink = _path.join(relativePath, pageName);
  const siteMapEntry = {
    permalink,
    title:
      schemaData.page.title ||
      pageName.charAt(0).toUpperCase() + pageName.slice(1),
  };
  // check if file is actually an index page for a directory
  try {
    const directoryPath = _path.join(fullPath, name.split(".")[0]);
    const stats = await fs.stat(directoryPath);
    if (stats.isDirectory()) {
      return {
        ...siteMapEntry,
        children: await processDirectory(directoryPath, permalink),
      };
    }
    return siteMapEntry;
  } catch (error) {
    return siteMapEntry;
  }
}

// Returns new index files that were generated as they might have to be added to _pages.json
async function generateIndexFilesForDirectoriesIfMissing(dirEntries) {
  const newIndexFiles = [];
  for (const dirEntry of dirEntries) {
    const indexFilePath = _path.join(dirEntry.path, dirEntry.name + ".json");
    try {
      await fs.access(indexFilePath);
    } catch (error) {
      const dirName = dirEntry.name.split(".")[0].replace(/-/g, " ");
      await fs.writeFile(
        indexFilePath,
        JSON.stringify(
          {
            version: "0.1.0",
            layout: "content",
            page: {
              title: dirName.charAt(0).toUpperCase() + dirName.slice(1),
              contentPageHeader: {},
            },
            content: [],
          },
          null,
          2
        )
      );
      newIndexFiles.push(dirEntry.name);
    }
  }
  return newIndexFiles;
}

async function processDirectory(fullPath, relativePath) {
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  const dirEntries = entries.filter((entry) => entry.isDirectory());
  // generate index files for directories if they do not exist
  const newIndexFiles = await generateIndexFilesForDirectoriesIfMissing(
    dirEntries
  );
  const updatedEntries = await fs.readdir(fullPath, { withFileTypes: true });
  const fileEntries = updatedEntries.filter((entry) => entry.isFile());

  let children = [];
  // Check if _pages.json exists
  const pageOrderFilePath = _path.join(fullPath, "_pages.json");
  const pageOrderData = await readSchemaJson(pageOrderFilePath);
  if (pageOrderData) {
    const childPages = pageOrderData["pages"];
    // add generated index pages to the list of child pages
    for (const newIndexFile of newIndexFiles) {
      if (!childPages.includes(newIndexFile)) {
        childPages.push(newIndexFile);
      }
    }
    for (const child of childPages) {
      const childEntry = await processFile(
        fullPath,
        relativePath,
        child + ".json"
      );
      if (childEntry) {
        children.push(childEntry);
      }
    }
  } else {
    // If _pages.json does not exist, process files in the directory in arbitrary order
    for (const fileEntry of fileEntries) {
      const childEntry = await processFile(
        fileEntry.path,
        relativePath,
        fileEntry.name
      );
      if (childEntry) {
        children.push(childEntry);
      }
    }
  }

  return children;
}

async function processSchemaDirectory() {
  const entries = await fs.readdir(schemaDirPath, { withFileTypes: true });
  const dirEntries = entries.filter((entry) => entry.isDirectory());
  // generate index files for directories if they do not exist
  await generateIndexFilesForDirectoriesIfMissing(dirEntries);
  const updatedEntries = await fs.readdir(schemaDirPath, {
    withFileTypes: true,
  });
  const fileEntries = updatedEntries.filter((entry) => entry.isFile());

  let children = [];
  // not ordering top level pages at the moment
  for (const fileEntry of fileEntries) {
    if (fileEntry.name === "index.json") {
      continue;
    }
    const childEntry = await processFile(schemaDirPath, "/", fileEntry.name);
    if (childEntry) {
      children.push(childEntry);
    }
  }

  return children;
}

async function generateSitemap() {
  const children = await processSchemaDirectory();
  const sitemap = {
    title: "Home",
    permalink: "/",
    children,
  };

  await fs.writeFile(sitemapPath, JSON.stringify(sitemap, null, 2));
  console.log("Sitemap generated at:", sitemapPath);
}

generateSitemap().catch(console.error);
