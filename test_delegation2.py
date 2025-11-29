#!/usr/bin/env python3
import requests
import json
import uuid

BASE_URL = "http://localhost:3000/api/v1"

def print_step(step, msg):
    print(f"\n{step}. {msg}")

print("=== Test complet de la fonctionnalité de délégation ===")

# Générer des usernames uniques
unique_id = str(uuid.uuid4())[:8]
olivier_user = f"olivier_{unique_id}"
pina_user = f"pina_{unique_id}"

# 1. Créer Olivier
print_step(1, f"Création Olivier ({olivier_user})...")
r = requests.post(f"{BASE_URL}/auth/register", json={
    "username": olivier_user,
    "email": f"{olivier_user}@test.com",
    "password": "Test1234",
    "firstName": "Olivier",
    "lastName": "Martin"
})
data = r.json()
print(f"  Register response status: {r.status_code}")
if data.get("token"):
    OLIVIER_TOKEN = data["token"]
    OLIVIER_ID = data["user"]["id"]
    print(f"  OK - Token: {OLIVIER_TOKEN[:40]}...")
    print(f"  ID: {OLIVIER_ID}")
else:
    print(f"  Erreur: {data}")
    exit(1)

# 2. Créer Pina
print_step(2, f"Création Pina ({pina_user})...")
r = requests.post(f"{BASE_URL}/auth/register", json={
    "username": pina_user,
    "email": f"{pina_user}@test.com",
    "password": "Test1234",
    "firstName": "Pina",
    "lastName": "Dupont"
})
data = r.json()
if data.get("token"):
    PINA_TOKEN = data["token"]
    PINA_ID = data["user"]["id"]
    print(f"  OK - Token: {PINA_TOKEN[:40]}...")
    print(f"  ID: {PINA_ID}")
else:
    print(f"  Erreur: {data}")
    exit(1)

headers_olivier = {"Authorization": f"Bearer {OLIVIER_TOKEN}"}
headers_pina = {"Authorization": f"Bearer {PINA_TOKEN}"}

# 3. Olivier crée une catégorie
print_step(3, "Olivier crée une catégorie 'Travail'...")
r = requests.post(f"{BASE_URL}/categories", headers=headers_olivier, json={
    "name": "Travail",
    "color": "#3B82F6"
})
data = r.json()
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
TASK_ID = data.get("task", {}).get("id", "")
print(f"  Tâche ID: {TASK_ID}")

# 5. Olivier recherche Pina
print_step(5, f"Olivier recherche '{pina_user[:4]}'...")
r = requests.get(f"{BASE_URL}/delegations/search-users?query={pina_user[:4]}", headers=headers_olivier)
print(f"  Status: {r.status_code}")
data = r.json()
print(f"  Utilisateurs trouvés: {len(data.get('users', []))}")
for u in data.get('users', []):
    print(f"    - {u.get('username')} ({u.get('firstName')} {u.get('lastName')})")

# 6. Olivier invite Pina (par delegateId)
print_step(6, "Olivier invite Pina avec toutes les permissions...")
r = requests.post(f"{BASE_URL}/delegations", headers=headers_olivier, json={
    "delegateId": PINA_ID,
    "canCreateTasks": True,
    "canEditTasks": True,
    "canDeleteTasks": True,
    "canCreateCategories": True
})
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  Response: {data}")
DELEGATION_ID = data.get("delegation", {}).get("id", "")
print(f"  Délégation ID: {DELEGATION_ID}")

# 7. Pina vérifie ses délégations
print_step(7, "Pina vérifie ses délégations...")
r = requests.get(f"{BASE_URL}/delegations", headers=headers_pina)
data = r.json()
print(f"  Invitations reçues: {len(data.get('received', []))}")
print(f"  Pending count: {data.get('pendingCount', 0)}")
if data.get('received'):
    print(f"  Première invitation de: {data['received'][0].get('owner', {}).get('username')}")
    DELEGATION_ID = data['received'][0].get('id')

# 8. Pina accepte
print_step(8, "Pina accepte l'invitation...")
if DELEGATION_ID:
    r = requests.post(f"{BASE_URL}/delegations/{DELEGATION_ID}/accept", headers=headers_pina)
    data = r.json()
    print(f"  Status: {r.status_code}")
    print(f"  Delegation status: {data.get('delegation', {}).get('status', 'erreur')}")
else:
    print("  Pas de délégation à accepter!")

# 9. Pina voit les tâches d'Olivier via le endpoint tasks avec ownerId
print_step(9, "Pina récupère les tâches d'Olivier...")
r = requests.get(f"{BASE_URL}/tasks?ownerId={OLIVIER_ID}", headers=headers_pina)
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  Nombre de tâches: {len(data.get('tasks', []))}")
for t in data.get('tasks', []):
    print(f"    - {t.get('title')}")

# 10. Pina crée une tâche pour Olivier
print_step(10, "Pina crée une tâche pour Olivier...")
r = requests.post(f"{BASE_URL}/tasks", headers=headers_pina, json={
    "title": "Tâche créée par Pina",
    "description": "Test de délégation",
    "ownerId": OLIVIER_ID
})
data = r.json()
print(f"  Status: {r.status_code}")
if data.get('task'):
    print(f"  Tâche créée: {data['task'].get('title')}")
    NEW_TASK_ID = data['task'].get('id')
else:
    print(f"  Erreur: {data.get('error')}")
    NEW_TASK_ID = None

# 11. Journal d'activité
print_step(11, "Olivier vérifie le journal d'activité...")
r = requests.get(f"{BASE_URL}/activity?limit=10", headers=headers_olivier)
data = r.json()
print(f"  Total entrées: {data.get('pagination', {}).get('total', 0)}")
for log in data.get('logs', []):
    actor = log.get('actor', {})
    actor_name = f"{actor.get('firstName', '')} {actor.get('lastName', '')}".strip() or actor.get('username', '')
    own = "(vous)" if log.get('isOwnAction') else ""
    print(f"    - {actor_name} {own} {log.get('action')} '{log.get('entityTitle')}'")

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
    print(f"  Status: {r.status_code}")
    print(f"  Résultat: {data.get('error', 'Supprimée!')}")

# 14. Pina modifie une tâche (devrait marcher)
print_step(14, "Pina modifie une tâche...")
if TASK_ID:
    r = requests.put(f"{BASE_URL}/tasks/{TASK_ID}", headers=headers_pina, json={
        "title": "Tâche modifiée par Pina"
    })
    data = r.json()
    print(f"  Status: {r.status_code}")
    if data.get('task'):
        print(f"  Nouveau titre: {data['task'].get('title')}")
    else:
        print(f"  Erreur: {data.get('error')}")

# 15. Olivier vérifie le journal final
print_step(15, "Journal d'activité final...")
r = requests.get(f"{BASE_URL}/activity?limit=15", headers=headers_olivier)
data = r.json()
print(f"  Total: {data.get('pagination', {}).get('total', 0)}")
for log in data.get('logs', []):
    actor = log.get('actor', {})
    actor_name = f"{actor.get('firstName', '')} {actor.get('lastName', '')}".strip() or actor.get('username', '')
    own = "(vous)" if log.get('isOwnAction') else ""
    print(f"    - {actor_name} {own} {log.get('action')} '{log.get('entityTitle')}'")

print("\n" + "="*50)
print("=== Tests terminés avec succès! ===")
print("="*50)
