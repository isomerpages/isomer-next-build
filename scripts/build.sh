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

# Temporary until we start doing proper releases of the Isomer components
curl -L https://schema.isomer.gov.sg/isomerpages-isomer-components-0.0.13.tgz -o isomerpages-isomer-components-0.0.13.tgz
npm install isomerpages-isomer-components-0.0.13.tgz

#######################################################################
# Generate sitemap.json and search index                              #
#######################################################################
mkdir -p scripts/

curl https://raw.githubusercontent.com/isomerpages/isomer-next-build/main/scripts/generate-sitemap.js -o scripts/generate-sitemap.js
# curl https://raw.githubusercontent.com/isomerpages/isomer-next-build/main/scripts/generate-search-index.js -o scripts/generate-search-index.js

node scripts/generate-sitemap.js

echo "Sitemap generated"

# node scripts/generate-search-index.js

# echo "Search index generated"

#######################################################################
# Copy to public folder                                               #
#######################################################################

cp -v sitemap.json public/
# cp -v searchIndex.json public/

echo "Copied sitemap and search index to public folder"

#######################################################################
# Build the site                                                      #
#######################################################################

npm run build

echo "Build completed"
