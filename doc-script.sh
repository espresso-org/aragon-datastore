#!/bin/bash

# Replace `doc/index.html` with `doc/classes/_index_.datastore.html`
cp doc/classes/_index_.datastore.html doc;
rm -rf doc/index.html;
rm -rf doc/classes/_index_.datastore.html;
mv doc/_index_.datastore.html doc/index.html;
# Replace every instance of `../` with `./` inside `doc/index.html`
sed -Ei '' 's/\.\.\//\.\//g' doc/index.html;
# Delete useless folders/files
rm -rf doc/modules;
rm -rf doc/classes;
# Remove random <ul> in page
sed -Ei '' 's/<ul class="after-current">/<ul class="after-current" style="display: none">/g' doc/index.html;
# Add script to `doc/index.html` head
sed -Ei '' 's/<head>/<head><script>localStorage.setItem("visibility", "public")<\/script>/g' doc/index.html;