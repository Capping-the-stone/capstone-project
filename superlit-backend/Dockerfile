# ---- Base Stage ----
FROM golang:1.23 AS base
WORKDIR /superlit/backend

# Install firejail, gcc
RUN apt-get update && apt-get install -y firejail python3 gcc

# Copy Go module files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the entire backend source code
COPY . .

# Copy firejail profile
COPY firejail/superlit.profile /etc/firejail/superlit.profile

# ---- Development Stage ----
FROM base AS dev
EXPOSE 6969
CMD ["go", "run", "main.go"]

# ---- Production Stage ----
FROM base AS prod
# Build and run the Go application
RUN go build .
CMD ["/superlit/backend/superlit-backend"]
