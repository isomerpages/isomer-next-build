const fs = require("fs");
const fsp = fs.promises;
const _path = require("path");

const schemaDirPath = _path.join(__dirname, "../schema");
const sitemapPath = _path.join(__dirname, "../sitemap.json");

async function readSchemaJson(filePath) {
  try {
    const schemaContent = await fsp.readFile(filePath, "utf8");
    return JSON.parse(schemaContent);
  } catch (error) {
    return null;
  }
}

async function processFile(fullPath, relativePath, name) {
  const permalink = relativePath.split(".")[0];
  const schemaData = await readSchemaJson(fullPath);
  if (!schemaData) {
    return null;
  }
  const pageName = name.split(".")[0].replace(/-/g, " ");
  const siteMapEntry = {
    permalink,
    title:
      schemaData.page.title ||
      pageName.charAt(0).toUpperCase() + pageName.slice(1),
  };

  // check if file is actually an index page for a directory
  const directoryPath = fullPath.split(".")[0];
  if (fs.existsSync(directoryPath)) {
    const isDirectory = (await fsp.stat(directoryPath)).isDirectory();
    if (isDirectory) {
      return {
        ...siteMapEntry,
        children: await processDirectory(directoryPath, permalink),
      };
    }
  }
  return siteMapEntry;
}

// generates sitemap entries and an index file for directories without an index file
async function processDanglingDirectory(fullPath, relativePath, name) {
  const children = await processDirectory(fullPath, relativePath);
  // TODO: Improve the content for generated index pages
  const listOfChildPages = {
    type: "unorderedlist",
    items: children.map(
      (child) => `<a href=${child.permalink}>${child.title}</a>`
    ),
  };

  const pageName = name.replace(/-/g, " ");
  const title = pageName.charAt(0).toUpperCase() + pageName.slice(1);

  await fsp.writeFile(
    _path.join(fullPath + ".json"),
    JSON.stringify(
      {
        version: "0.1.0",
        layout: "content",
        page: {
          title,
          contentPageHeader: {
            summary: `Pages in ${title}`,
          },
        },
        content: [listOfChildPages],
      },
      null,
      2
    )
  );
  return {
    permalink: relativePath,
    title,
    children,
  };
}

async function processDirectory(fullPath, relativePath) {
  const entries = await fsp.readdir(fullPath, { withFileTypes: true });
  const fileEntries = entries.filter((entry) => entry.isFile());

  let children = [];
  // Check if _pages.json exists
  const pageOrderFilePath = _path.join(fullPath, "_pages.json");
  const pageOrderData = await readSchemaJson(pageOrderFilePath);
  if (pageOrderData) {
    const childPages = pageOrderData["pages"];
    for (const child of childPages) {
      const fileName = child + ".json";
      const childEntry = await processFile(
        _path.join(fullPath, fileName),
        _path.join(relativePath, fileName),
        fileName
      );
      if (childEntry) {
        children.push(childEntry);
      }
    }
  } else {
    // If _pages.json does not exist, process files in the directory in arbitrary order
    for (const fileEntry of fileEntries) {
      if (relativePath === "/" && fileEntry.name === "index.json") {
        continue;
      }
      const childEntry = await processFile(
        _path.join(fullPath, fileEntry.name),
        _path.join(relativePath, fileEntry.name),
        fileEntry.name
      );
      if (childEntry) {
        children.push(childEntry);
      }
    }
  }

  // process any directories that do not have a corresponding index file
  const danglingDirEntries = entries
    .filter((entry) => entry.isDirectory())
    .filter(
      (dirEntry) =>
        !fileEntries.find(
          (fileEntry) => fileEntry.name === dirEntry.name + ".json"
        )
    );

  for (const dirEntry of danglingDirEntries) {
    children.push(
      await processDanglingDirectory(
        _path.join(fullPath, dirEntry.name),
        _path.join(relativePath, dirEntry.name),
        dirEntry.name
      )
    );
  }

  return children;
}

async function generateSitemap() {
  const children = await processDirectory(schemaDirPath, "/");
  const sitemap = {
    title: "Home",
    permalink: "/",
    children,
  };

  await fsp.writeFile(sitemapPath, JSON.stringify(sitemap, null, 2));
  console.log("Sitemap generated at:", sitemapPath);
}

generateSitemap().catch(console.error);
