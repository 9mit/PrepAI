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

# Runtime command: Start the static file server
CMD serve -s dist -l 7860
