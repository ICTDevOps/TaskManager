#!/usr/bin/env python3
import requests
import uuid

BASE_URL = "http://localhost:3000/api/v1"

print("=== Test du journal d'activité avec logs des deux côtés ===\n")

# Créer deux utilisateurs uniques
unique_id = str(uuid.uuid4())[:6]
alice_user = f"alice_{unique_id}"
bob_user = f"bob_{unique_id}"

# 1. Créer Alice (propriétaire)
print(f"1. Création Alice ({alice_user})...")
r = requests.post(f"{BASE_URL}/auth/register", json={
    "username": alice_user,
    "email": f"{alice_user}@test.com",
    "password": "Test1234",
    "firstName": "Alice",
    "lastName": "Martin"
})
ALICE_TOKEN = r.json()["token"]
ALICE_ID = r.json()["user"]["id"]
print(f"   OK - ID: {ALICE_ID}")

# 2. Créer Bob (délégué)
print(f"2. Création Bob ({bob_user})...")
r = requests.post(f"{BASE_URL}/auth/register", json={
    "username": bob_user,
    "email": f"{bob_user}@test.com",
    "password": "Test1234",
    "firstName": "Bob",
    "lastName": "Dupont"
})
BOB_TOKEN = r.json()["token"]
BOB_ID = r.json()["user"]["id"]
print(f"   OK - ID: {BOB_ID}")

headers_alice = {"Authorization": f"Bearer {ALICE_TOKEN}"}
headers_bob = {"Authorization": f"Bearer {BOB_TOKEN}"}

# 3. Alice invite Bob
print("\n3. Alice invite Bob avec tous les droits...")
r = requests.post(f"{BASE_URL}/delegations", headers=headers_alice, json={
    "delegateId": BOB_ID,
    "canCreateTasks": True,
    "canEditTasks": True,
    "canDeleteTasks": True,
    "canCreateCategories": True
})
DELEGATION_ID = r.json()["delegation"]["id"]
print(f"   Délégation créée: {DELEGATION_ID}")

# 4. Bob accepte
print("4. Bob accepte l'invitation...")
r = requests.post(f"{BASE_URL}/delegations/{DELEGATION_ID}/accept", headers=headers_bob)
print(f"   Status: {r.json()['delegation']['status']}")

# 5. Bob crée une tâche pour Alice
print("\n5. Bob crée une tâche pour Alice...")
r = requests.post(f"{BASE_URL}/tasks", headers=headers_bob, json={
    "title": "Tâche créée par Bob pour Alice",
    "description": "Test double log",
    "ownerId": ALICE_ID
})
print(f"   Tâche créée: {r.json()['task']['title']}")

# 6. Bob crée une catégorie pour Alice
print("6. Bob crée une catégorie pour Alice...")
r = requests.post(f"{BASE_URL}/categories", headers=headers_bob, json={
    "name": "Catégorie de Bob",
    "color": "#FF5733",
    "ownerId": ALICE_ID
})
print(f"   Catégorie créée: {r.json()['category']['name']}")

# 7. Journal d'activité d'Alice
print("\n" + "="*50)
print("7. Journal d'activité d'Alice (propriétaire):")
print("="*50)
r = requests.get(f"{BASE_URL}/activity?limit=10", headers=headers_alice)
data = r.json()
print(f"   Total entrées: {data['pagination']['total']}")
for log in data['logs']:
    actor_name = f"{log['actor'].get('firstName', '')} {log['actor'].get('lastName', '')}".strip()
    target = f" pour {log['targetOwner']['firstName']} {log['targetOwner']['lastName']}" if log.get('targetOwner') else ""
    is_own = "(vous)" if log['isOwnAction'] else ""
    print(f"   - {actor_name} {is_own} {log['action']} '{log['entityTitle']}'{target}")

# 8. Journal d'activité de Bob
print("\n" + "="*50)
print("8. Journal d'activité de Bob (délégué):")
print("="*50)
r = requests.get(f"{BASE_URL}/activity?limit=10", headers=headers_bob)
data = r.json()
print(f"   Total entrées: {data['pagination']['total']}")
for log in data['logs']:
    actor_name = f"{log['actor'].get('firstName', '')} {log['actor'].get('lastName', '')}".strip()
    target = f" pour {log['targetOwner']['firstName']} {log['targetOwner']['lastName']}" if log.get('targetOwner') else ""
    is_own = "(vous)" if log['isOwnAction'] else ""
    print(f"   - {actor_name} {is_own} {log['action']} '{log['entityTitle']}'{target}")

print("\n=== Test terminé avec succès! ===")
