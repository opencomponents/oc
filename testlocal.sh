npx tsc
rm -rf ~/Dev/access/oc-registry/node_modules/oc/dist
cp -R dist ~/Dev/access/oc-registry/node_modules/oc
cd ~/Dev/access/oc-registry
node index.js