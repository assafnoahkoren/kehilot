# ---- BUILD LIBRARIES ----------------------------------------------------------------------
# Base image
FROM node:20 AS build

# Create app directory
WORKDIR /app

COPY yarn.lock ./
COPY projects/db ./

RUN yarn install

RUN yarn prisma generate


# ---- NODE_MODULES PHASE ---------------------------------------------------------------------

# Base image
FROM node:20 AS modules

# Create app directory
WORKDIR /app

COPY yarn.lock ./
COPY projects/server/package.json ./

# Install app dependencies
RUN yarn install
COPY --from=build /app/node_modules ./node_modules

# ---- BUILD PHASE ---------------------------------------------------------------------

FROM node:20 AS production

WORKDIR /app

COPY projects/server ./
COPY --from=modules /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 5559

# Creates a "dist" folder with the production build
RUN yarn build


# Start the server using the production build
CMD [ "node", "dist/main.js" ]
