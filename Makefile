.PHONY: dev build deploy test lint

dev:
	npm run dev

build:
	npm run build

deploy:
	npm run deploy

test:
	npm test

lint:
	npx @biomejs/biome check .
