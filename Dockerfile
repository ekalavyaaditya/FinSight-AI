# Use official Node.js lts image
FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

# Use nginx to serve the static built SPA
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Copy simple Nginx config to support client side routing
RUN echo 'server { \
    listen 3000; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
