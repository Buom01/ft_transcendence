FROM	node:lts-alpine

WORKDIR	/usr/src/app

COPY	./app .

RUN 	npm install

RUN		npm run build

CMD		["node", "dist/main"]
