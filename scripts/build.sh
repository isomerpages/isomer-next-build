#!/bin/sh

echo "Build started..."

#######################################################################
# Download package.json and package-lock.json files from central repo #
#######################################################################

curl https://raw.githubusercontent.com/isomerpages/isomer-next-base-template/main/package.json -o package.json
curl https://raw.githubusercontent.com/isomerpages/isomer-next-base-template/main/package-lock.json -o package-lock.json
curl https://raw.githubusercontent.com/isomerpages/isomer-next-base-template/main/tailwind.config.js -o tailwind.config.js

#######################
# Install NPM modules #
#######################

npm install

#######################################################################
# Generate sitemap.json and search index #
#######################################################################
mkdir -p src/scripts/

curl https://raw.githubusercontent.com/isomerpages/isomer-next-build/main/scripts/generate-sitemap.js -o src/scripts/generate-sitemap.js
curl https://raw.githubusercontent.com/isomerpages/isomer-next-build/main/scripts/generate-search-index.js -o src/scripts/generate-search-index.js

node src/scripts/generate-sitemap.js

echo "Sitemap generated"

node src/scripts/generate-search-index.js

echo "Search index generated"

#######################################################################
# Copy to public folder #
#######################################################################

cp -v src/sitemap.json public/
cp -v src/searchIndex.json public/

echo "Copied sitemap and search index to public folder"


