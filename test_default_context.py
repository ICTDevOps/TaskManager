#!/usr/bin/env python3
import requests
import uuid

BASE_URL = "http://localhost:3000/api/v1"

print("=== Test du contexte par défaut ===\n")

unique_id = str(uuid.uuid4())[:6]
owner_user = f"owner_{unique_id}"
delegate_user = f"delegate_{unique_id}"

# 1. Créer Owner
print(f"1. Création Owner ({owner_user})...")
r = requests.post(f"{BASE_URL}/auth/register", json={
    "username": owner_user,
    "email": f"{owner_user}@test.com",
    "password": "Test1234",
    "firstName": "Owner",
    "lastName": "Test"
})
OWNER_TOKEN = r.json()["token"]
OWNER_ID = r.json()["user"]["id"]
print(f"   ID: {OWNER_ID}")

# 2. Créer Delegate
print(f"2. Création Delegate ({delegate_user})...")
r = requests.post(f"{BASE_URL}/auth/register", json={
    "username": delegate_user,
    "email": f"{delegate_user}@test.com",
    "password": "Test1234",
    "firstName": "Delegate",
    "lastName": "Test"
})
DELEGATE_TOKEN = r.json()["token"]
DELEGATE_ID = r.json()["user"]["id"]
default_ctx = r.json()["user"].get("defaultContext", "non retourné")
print(f"   ID: {DELEGATE_ID}")
print(f"   defaultContext initial: {default_ctx}")

headers_owner = {"Authorization": f"Bearer {OWNER_TOKEN}"}
headers_delegate = {"Authorization": f"Bearer {DELEGATE_TOKEN}"}

# 3. Owner invite Delegate
print("\n3. Owner invite Delegate...")
r = requests.post(f"{BASE_URL}/delegations", headers=headers_owner, json={
    "delegateId": DELEGATE_ID,
    "canCreateTasks": True,
    "canEditTasks": True,
    "canDeleteTasks": True,
    "canCreateCategories": True
})
DELEGATION_ID = r.json()["delegation"]["id"]

# 4. Delegate accepte
print("4. Delegate accepte...")
r = requests.post(f"{BASE_URL}/delegations/{DELEGATION_ID}/accept", headers=headers_delegate)
print(f"   Status: {r.json()['delegation']['status']}")

# 5. Delegate définit Owner comme contexte par défaut
print(f"\n5. Delegate définit les tâches de Owner comme défaut...")
r = requests.patch(f"{BASE_URL}/auth/default-context", headers=headers_delegate, json={
    "defaultContext": OWNER_ID
})
print(f"   Status: {r.status_code}")
if r.status_code == 200:
    print(f"   Nouveau defaultContext: {r.json()['user']['defaultContext']}")
else:
    print(f"   Erreur: {r.json()}")

# 6. Vérifier au login que le contexte est bien retourné
print("\n6. Login Delegate pour vérifier...")
r = requests.post(f"{BASE_URL}/auth/login", json={
    "identifier": delegate_user,
    "password": "Test1234"
})
user_data = r.json()["user"]
print(f"   defaultContext au login: {user_data.get('defaultContext', 'non retourné')}")
print(f"   Attendu: {OWNER_ID}")
print(f"   Match: {user_data.get('defaultContext') == OWNER_ID}")

# 7. Remettre à "self"
print("\n7. Delegate remet 'self' comme défaut...")
r = requests.patch(f"{BASE_URL}/auth/default-context", headers=headers_delegate, json={
    "defaultContext": "self"
})
print(f"   Nouveau defaultContext: {r.json()['user']['defaultContext']}")

# 8. Test d'erreur: contexte invalide
print("\n8. Test avec contexte invalide (UUID random)...")
fake_id = str(uuid.uuid4())
r = requests.patch(f"{BASE_URL}/auth/default-context", headers=headers_delegate, json={
    "defaultContext": fake_id
})
print(f"   Status: {r.status_code}")
print(f"   Erreur attendue: {r.json().get('error', 'aucune')}")

print("\n=== Test terminé avec succès! ===")
