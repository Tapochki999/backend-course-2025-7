# Inventory Management API

A Node.js/Express REST API for managing an inventory with photo uploads, built with MySQL and Docker support. Includes Swagger documentation and simple HTML forms for registration and search.

## Features
- Register inventory items with name, description, and photo
- CRUD operations for inventory items
- Upload and update item photos
- Search inventory by ID
- Swagger API docs at `/docs`
- Docker and Docker Compose support

## Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### Environment Variables
Copy `.env.sample` to `.env` and adjust as needed:
```
HOST=0.0.0.0
PORT=3000
CACHE_DIR=./cache
DB_HOST=localhost
DB_USER=user
DB_PASSWORD=password
DB_NAME=inventory_db
DB_PORT=3306
MYSQL_ROOT_PASSWORD=secret
```

### Install & Run (Locally)
```sh
npm install
node main.js -h 0.0.0.0 -p 3000 -c ./cache
```

### Using Docker Compose
```sh
docker compose up --build
```

## API Endpoints
- `POST /register` — Register new item (multipart/form-data)
- `GET /inventory` — List all items
- `GET /inventory/:id` — Get item by ID
- `PUT /inventory/:id` — Update item
- `DELETE /inventory/:id` — Delete item
- `GET /inventory/:id/photo` — Get item photo
- `PUT /inventory/:id/photo` — Update item photo
- `POST /search` — Search item by ID

## HTML Forms
- `RegisterForm.html` — Register new inventory item
- `SearchForm.html` — Search inventory by ID

## Database
- MySQL table: `inventory` (see `init.sql` for schema)


