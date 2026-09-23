FROM node:24

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm ci

COPY . /app

CMD npm run build && npm run serve
