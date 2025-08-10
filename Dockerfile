FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
#RUN npm install ajv@^8 ajv-keywords@^5 typeorm @types/typeorm --save-dev --legacy-peer-deps
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
