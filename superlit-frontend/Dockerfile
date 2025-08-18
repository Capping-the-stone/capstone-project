# ---- Base Stage ----
FROM node:20 AS base
WORKDIR /superlit/frontend

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the entire frontend source code
COPY . .


# ---- Development Stage ----
FROM base AS dev
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# ---- Build Stage ----
FROM base AS build
RUN npm run build

# ---- Production Stage ----
FROM nginx:alpine AS prod
COPY --from=build /superlit/frontend/dist /usr/share/nginx/html

COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
