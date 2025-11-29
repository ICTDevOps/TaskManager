#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:3000/api/v1"

def print_step(step, msg):
    print(f"\n{step}. {msg}")

print("=== Test complet de la fonctionnalité de délégation ===")

# 1. Créer et obtenir le token d'Olivier
print_step(1, "Création/Login Olivier...")
r = requests.post(f"{BASE_URL}/auth/register", json={
    "username": "olivier_deleg",
    "email": "olivier_deleg@test.com",
    "password": "Test1234",
    "firstName": "Olivier",
    "lastName": "Martin"
})
data = r.json()
print(f"  Register response: {data}")

# Utiliser le token de la création directement, ou login si déjà existant
if data.get("token"):
    OLIVIER_TOKEN = data["token"]
    OLIVIER_ID = data["user"]["id"]
else:
    # Login si déjà existant
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "login": "olivier_deleg",
        "password": "Test1234"
    })
    data = r.json()
    print(f"  Login response: {data}")
    OLIVIER_TOKEN = data["token"]
    OLIVIER_ID = data["user"]["id"]

print(f"  Token Olivier: {OLIVIER_TOKEN[:50]}...")
print(f"  ID Olivier: {OLIVIER_ID}")

# 2. Créer et obtenir le token de Pina
print_step(2, "Création/Login Pina...")
r = requests.post(f"{BASE_URL}/auth/register", json={
    "username": "pina_deleg",
    "email": "pina_deleg@test.com",
    "password": "Test1234",
    "firstName": "Pina",
    "lastName": "Dupont"
})
data = r.json()
print(f"  Register response: {data}")

if data.get("token"):
    PINA_TOKEN = data["token"]
    PINA_ID = data["user"]["id"]
else:
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "login": "pina_deleg",
        "password": "Test1234"
    })
    data = r.json()
    print(f"  Login response: {data}")
    PINA_TOKEN = data["token"]
    PINA_ID = data["user"]["id"]

print(f"  Token Pina: {PINA_TOKEN[:50]}...")
print(f"  ID Pina: {PINA_ID}")

headers_olivier = {"Authorization": f"Bearer {OLIVIER_TOKEN}"}
headers_pina = {"Authorization": f"Bearer {PINA_TOKEN}"}

# Test rapide de l'auth
print_step("2b", "Test authentification...")
r = requests.get(f"{BASE_URL}/auth/profile", headers=headers_olivier)
print(f"  Profile Olivier: {r.status_code} - {r.json()}")

# 3. Olivier crée une catégorie
print_step(3, "Olivier crée une catégorie 'Travail'...")
r = requests.post(f"{BASE_URL}/categories", headers=headers_olivier, json={
    "name": "Travail Deleg",
    "color": "#3B82F6"
})
data = r.json()
print(f"  Response: {data}")
CATEGORY_ID = data.get("category", {}).get("id", "")
print(f"  Catégorie ID: {CATEGORY_ID}")

# 4. Olivier crée une tâche
print_step(4, "Olivier crée une tâche...")
r = requests.post(f"{BASE_URL}/tasks", headers=headers_olivier, json={
    "title": "Tâche test d'Olivier",
    "description": "Une tâche de test",
    "categoryId": CATEGORY_ID if CATEGORY_ID else None
})
data = r.json()
print(f"  Response: {data}")
TASK_ID = data.get("task", {}).get("id", "")
print(f"  Tâche ID: {TASK_ID}")

# 5. Olivier recherche Pina
print_step(5, "Olivier recherche 'pina'...")
r = requests.get(f"{BASE_URL}/delegations/search-users?query=pina", headers=headers_olivier)
print(f"  Status: {r.status_code}")
print(f"  Résultat: {r.json()}")

# 6. Olivier invite Pina
print_step(6, "Olivier invite Pina avec toutes les permissions...")
r = requests.post(f"{BASE_URL}/delegations", headers=headers_olivier, json={
    "delegateId": PINA_ID,
    "canCreateTasks": True,
    "canEditTasks": True,
    "canDeleteTasks": True,
    "canCreateCategories": True
})
data = r.json()
print(f"  Résultat: {data}")
DELEGATION_ID = data.get("delegation", {}).get("id", "")
print(f"  Délégation ID: {DELEGATION_ID}")

# 7. Pina vérifie ses délégations
print_step(7, "Pina vérifie ses délégations...")
r = requests.get(f"{BASE_URL}/delegations", headers=headers_pina)
data = r.json()
print(f"  Response: {data}")
print(f"  Invitations reçues: {len(data.get('received', []))}")
print(f"  Pending count: {data.get('pendingCount', 0)}")

# 8. Pina accepte
print_step(8, "Pina accepte l'invitation...")
if DELEGATION_ID:
    r = requests.post(f"{BASE_URL}/delegations/{DELEGATION_ID}/accept", headers=headers_pina)
    data = r.json()
    print(f"  Status: {data.get('delegation', {}).get('status', 'erreur')}")
else:
    print("  Pas de délégation à accepter")

# 9. Pina voit les tâches d'Olivier
print_step(9, "Pina récupère les tâches d'Olivier...")
r = requests.get(f"{BASE_URL}/tasks?ownerId={OLIVIER_ID}", headers=headers_pina)
data = r.json()
print(f"  Nombre de tâches: {len(data.get('tasks', []))}")
for t in data.get('tasks', []):
    print(f"    - {t.get('title')}")

# 10. Pina crée une tâche pour Olivier
print_step(10, "Pina crée une tâche pour Olivier...")
r = requests.post(f"{BASE_URL}/tasks", headers=headers_pina, json={
    "title": "Tâche créée par Pina pour Olivier",
    "description": "Test de délégation",
    "ownerId": OLIVIER_ID
})
data = r.json()
print(f"  Response: {data}")

# 11. Journal d'activité
print_step(11, "Olivier vérifie le journal d'activité...")
r = requests.get(f"{BASE_URL}/activity?limit=5", headers=headers_olivier)
data = r.json()
print(f"  Total: {data.get('pagination', {}).get('total', 0)}")
for log in data.get('logs', []):
    actor = log.get('actor', {})
    actor_name = f"{actor.get('firstName', '')} {actor.get('lastName', '')}".strip() or actor.get('username', '')
    print(f"    - {actor_name} {log.get('action')} '{log.get('entityTitle')}'")

# 12. Modifier permissions
print_step(12, "Olivier retire le droit de supprimer à Pina...")
if DELEGATION_ID:
    r = requests.put(f"{BASE_URL}/delegations/{DELEGATION_ID}", headers=headers_olivier, json={
        "canDeleteTasks": False
    })
    data = r.json()
    print(f"  canDeleteTasks: {data.get('delegation', {}).get('canDeleteTasks')}")

# 13. Pina essaie de supprimer
print_step(13, "Pina essaie de supprimer une tâche...")
if TASK_ID:
    r = requests.delete(f"{BASE_URL}/tasks/{TASK_ID}", headers=headers_pina)
    data = r.json()
    print(f"  Résultat: {data.get('error', 'Supprimée!')}")

# 14. Pina modifie une tâche
print_step(14, "Pina modifie une tâche...")
if TASK_ID:
    r = requests.put(f"{BASE_URL}/tasks/{TASK_ID}", headers=headers_pina, json={
        "title": "Tâche modifiée par Pina"
    })
    data = r.json()
    print(f"  Résultat: {'Modifiée!' if data.get('task') else data.get('error')}")

print("\n=== Tests terminés ===")
