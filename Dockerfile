# Developpement build
FROM	node:lts-alpine AS development
WORKDIR	/usr/src/app
COPY 	./app/ .
RUN 	npm install
RUN 	npm run build

# Production build
FROM	node:lts-alpine AS production
ARG		NODE_ENV=production
ENV 	NODE_ENV=${NODE_ENV}
WORKDIR /usr/src/app
COPY 	./app/ .
RUN 	npm install --only=production
COPY 	--from=development /usr/src/app/dist ./dist
CMD		["node", "dist/main"]
