#!/bin/bash
set -e
echo "=== Uploading .next/build ==="
scp -o StrictHostKeyChecking=no -r "d:/link168/deploy-pkg/.next/build" root@47.101.69.52:/tmp/link168-next/
echo "=== Uploading .next/server ==="
scp -o StrictHostKeyChecking=no -r "d:/link168/deploy-pkg/.next/server" root@47.101.69.52:/tmp/link168-next/
echo "=== Uploading .next/static ==="
scp -o StrictHostKeyChecking=no -r "d:/link168/deploy-pkg/.next/static" root@47.101.69.52:/tmp/link168-next/
echo "=== Uploading manifest json ==="
scp -o StrictHostKeyChecking=no "d:/link168/deploy-pkg/.next/"*.json root@47.101.69.52:/tmp/link168-next/
echo "=== Uploading dashboard-page.tsx ==="
scp -o StrictHostKeyChecking=no "d:/link168/deploy-pkg/dashboard-page.tsx" root@47.101.69.52:/tmp/link168-next/
echo "=== Uploading package.json ==="
scp -o StrictHostKeyChecking=no "d:/link168/deploy-pkg/package.json" root@47.101.69.52:/tmp/link168-next/
echo "=== Uploading package-lock.json ==="
scp -o StrictHostKeyChecking=no "d:/link168/deploy-pkg/package-lock.json" root@47.101.69.52:/tmp/link168-next/
echo "=== ALL_UPLOADED ==="
