#!/bin/bash

jspm bundle-sfx app.js dist/app.js
rm -rf dist/workers
cp -r workers dist
