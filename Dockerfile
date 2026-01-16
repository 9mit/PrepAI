FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install static server
RUN npm install -g serve

# Expose Hugging Face Spaces port
EXPOSE 7860

# Runtime command: Inject environment variables and start server
CMD echo "window._env_ = { VITE_GROQ_API_KEY: \"$VITE_GROQ_API_KEY\" };" > ./dist/env-config.js && serve -s dist -l 7860
