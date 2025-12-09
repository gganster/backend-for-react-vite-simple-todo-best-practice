# API Tasks - Documentation

API REST simple pour gérer des tâches avec Express.js

## Installation

```bash
npm install
```

## Configuration

Créer un fichier `.env` à la racine :

```env
DATABASE_URL=postgresql://admin:admin123@localhost:5433/todo_db
PORT=3001
```

## Démarrage

### Option 1 : Développement local

**1. Démarrer PostgreSQL avec Docker :**
```bash
docker-compose up db -d
```

**2. Démarrer le serveur :**
```bash
npm start
```

### Option 2 : Docker Compose (Production)

**Démarrer tout avec Docker :**
```bash
docker-compose up -d
```

Cela démarre à la fois l'API et PostgreSQL dans des conteneurs.

Le serveur démarre sur `http://localhost:3001` par défaut.

### Option 3 : Build manuel de l'image

```bash
# Build l'image
docker build -t todo-api .

# Run le conteneur
docker run -p 3001:3001 -e DATABASE_URL=postgresql://admin:admin123@localhost:5433/todo_db todo-api
```

## Type de données

```typescript
type Task = {
  id: string      // UUID généré automatiquement
  title: string   // Titre de la tâche
  state: boolean  // État de la tâche (complétée ou non)
}
```

## Endpoints

### GET /status

Vérifie la connexion à la base de données.

**Réponse (200) :**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2023-12-06T10:30:00.000Z"
}
```

**Erreur (503) :**
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "connection refused"
}
```

---

### GET /tasks

Récupère toutes les tâches.

**Réponse :**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Ma première tâche",
    "state": false
  }
]
```

---

### GET /tasks/:id

Récupère une tâche spécifique par son ID.

**Paramètres :**
- `id` : UUID de la tâche

**Réponse (200) :**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Ma première tâche",
  "state": false
}
```

**Erreur (404) :**
```json
{
  "error": "Task not found"
}
```

---

### POST /tasks

Crée une nouvelle tâche.

**Body :**
```json
{
  "title": "Ma nouvelle tâche",
  "state": false
}
```

**Champs requis :**
- `title` (string) : Titre de la tâche

**Champs optionnels :**
- `state` (boolean) : État de la tâche, défaut = `false`

**Réponse (201) :**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Ma nouvelle tâche",
  "state": false
}
```

**Erreur (400) :**
```json
{
  "error": "Title is required and must be a string"
}
```

---

### PUT /tasks/:id

Met à jour une tâche existante.

**Paramètres :**
- `id` : UUID de la tâche

**Body :**
```json
{
  "title": "Titre modifié",
  "state": true
}
```

**Note :** Les champs sont optionnels, seuls ceux fournis seront mis à jour.

**Réponse (200) :**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Titre modifié",
  "state": true
}
```

**Erreur (404) :**
```json
{
  "error": "Task not found"
}
```

---

### DELETE /tasks/:id

Supprime une tâche.

**Paramètres :**
- `id` : UUID de la tâche

**Réponse (200) :**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Tâche supprimée",
  "state": false
}
```

**Erreur (404) :**
```json
{
  "error": "Task not found"
}
```

---

## Exemples d'utilisation

### Créer une tâche
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Acheter du lait", "state": false}'
```

### Récupérer toutes les tâches
```bash
curl http://localhost:3000/tasks
```

### Mettre à jour une tâche
```bash
curl -X PUT http://localhost:3000/tasks/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{"state": true}'
```

### Supprimer une tâche
```bash
curl -X DELETE http://localhost:3000/tasks/123e4567-e89b-12d3-a456-426614174000
```

## Configuration CORS

CORS est configuré pour accepter toutes les origines (`*`).

## Base de données

Utilise PostgreSQL via Docker. Les données sont persistées dans un volume Docker.

**Connection string :**
```
postgresql://admin:admin123@localhost:5433/todo_db
```

Le serveur continue de fonctionner même si la DB est indisponible (retourne 503 Service Unavailable).

