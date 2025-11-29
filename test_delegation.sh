#!/bin/bash

echo "=== Test complet de la fonctionnalité de délégation ==="
echo ""

# 1. Créer utilisateur Olivier (owner)
echo "1. Création de l'utilisateur Olivier..."
OLIVIER_REGISTER=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"olivier","email":"olivier@test.com","password":"Test123!","firstName":"Olivier","lastName":"Martin"}')
echo $OLIVIER_REGISTER | python3 -c "import sys,json; d=json.load(sys.stdin); print('  Olivier créé - ID:', d.get('user',{}).get('id','erreur ou déjà existant'))"

# 2. Login Olivier
echo ""
echo "2. Login Olivier..."
OLIVIER_LOGIN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"olivier","password":"Test123!"}')
OLIVIER_TOKEN=$(echo $OLIVIER_LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
OLIVIER_ID=$(echo $OLIVIER_LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id',''))")
echo "  Token obtenu: ${OLIVIER_TOKEN:0:30}..."
echo "  Olivier ID: $OLIVIER_ID"

# 3. Créer utilisateur Pina (delegate)
echo ""
echo "3. Création de l'utilisateur Pina..."
PINA_REGISTER=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"pina","email":"pina@test.com","password":"Test123!","firstName":"Pina","lastName":"Dupont"}')
echo $PINA_REGISTER | python3 -c "import sys,json; d=json.load(sys.stdin); print('  Pina créée - ID:', d.get('user',{}).get('id','erreur ou déjà existante'))"

# 4. Login Pina
echo ""
echo "4. Login Pina..."
PINA_LOGIN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"pina","password":"Test123!"}')
PINA_TOKEN=$(echo $PINA_LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
PINA_ID=$(echo $PINA_LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id',''))")
echo "  Token obtenu: ${PINA_TOKEN:0:30}..."
echo "  Pina ID: $PINA_ID"

# 5. Olivier crée une catégorie
echo ""
echo "5. Olivier crée une catégorie 'Travail'..."
CATEGORY=$(curl -s -X POST http://localhost:3000/api/v1/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OLIVIER_TOKEN" \
  -d '{"name":"Travail","color":"#3B82F6"}')
CATEGORY_ID=$(echo $CATEGORY | python3 -c "import sys,json; print(json.load(sys.stdin).get('category',{}).get('id',''))")
echo "  Catégorie créée - ID: $CATEGORY_ID"

# 6. Olivier crée une tâche
echo ""
echo "6. Olivier crée une tâche..."
TASK=$(curl -s -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OLIVIER_TOKEN" \
  -d "{\"title\":\"Tâche test d'Olivier\",\"description\":\"Une tâche de test\",\"categoryId\":\"$CATEGORY_ID\"}")
TASK_ID=$(echo $TASK | python3 -c "import sys,json; print(json.load(sys.stdin).get('task',{}).get('id',''))")
echo "  Tâche créée - ID: $TASK_ID"

# 7. Olivier recherche Pina pour la délégation
echo ""
echo "7. Olivier recherche 'pina' pour l'inviter..."
SEARCH=$(curl -s "http://localhost:3000/api/v1/delegations/search-users?query=pina" \
  -H "Authorization: Bearer $OLIVIER_TOKEN")
echo "  Résultat: $SEARCH"

# 8. Olivier invite Pina avec permissions
echo ""
echo "8. Olivier invite Pina avec toutes les permissions..."
INVITE=$(curl -s -X POST http://localhost:3000/api/v1/delegations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OLIVIER_TOKEN" \
  -d "{\"delegateId\":\"$PINA_ID\",\"canCreateTasks\":true,\"canEditTasks\":true,\"canDeleteTasks\":true,\"canCreateCategories\":true}")
DELEGATION_ID=$(echo $INVITE | python3 -c "import sys,json; print(json.load(sys.stdin).get('delegation',{}).get('id',''))")
echo "  Délégation créée - ID: $DELEGATION_ID"
echo "  Status: $(echo $INVITE | python3 -c "import sys,json; print(json.load(sys.stdin).get('delegation',{}).get('status',''))")"

# 9. Pina vérifie ses délégations (invitation en attente)
echo ""
echo "9. Pina vérifie ses délégations..."
PINA_DELEG=$(curl -s http://localhost:3000/api/v1/delegations \
  -H "Authorization: Bearer $PINA_TOKEN")
echo "  Invitations reçues: $(echo $PINA_DELEG | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('received',[])))")"
echo "  Pending count: $(echo $PINA_DELEG | python3 -c "import sys,json; print(json.load(sys.stdin).get('pendingCount',0))")"

# 10. Pina accepte l'invitation
echo ""
echo "10. Pina accepte l'invitation..."
ACCEPT=$(curl -s -X POST "http://localhost:3000/api/v1/delegations/$DELEGATION_ID/accept" \
  -H "Authorization: Bearer $PINA_TOKEN")
echo "  Status après acceptation: $(echo $ACCEPT | python3 -c "import sys,json; print(json.load(sys.stdin).get('delegation',{}).get('status',''))")"

# 11. Pina voit les tâches d'Olivier
echo ""
echo "11. Pina récupère les tâches d'Olivier..."
OLIVIER_TASKS=$(curl -s "http://localhost:3000/api/v1/tasks?ownerId=$OLIVIER_ID" \
  -H "Authorization: Bearer $PINA_TOKEN")
echo "  Nombre de tâches: $(echo $OLIVIER_TASKS | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('tasks',[])))")"

# 12. Pina crée une tâche pour Olivier
echo ""
echo "12. Pina crée une tâche pour Olivier..."
NEW_TASK=$(curl -s -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PINA_TOKEN" \
  -d "{\"title\":\"Tâche créée par Pina pour Olivier\",\"description\":\"Test de délégation\",\"ownerId\":\"$OLIVIER_ID\"}")
echo "  Résultat: $(echo $NEW_TASK | python3 -c "import sys,json; d=json.load(sys.stdin); print('Tâche créée!' if d.get('task') else d.get('error','Erreur'))")"

# 13. Olivier vérifie le journal d'activité
echo ""
echo "13. Olivier vérifie le journal d'activité..."
ACTIVITY=$(curl -s "http://localhost:3000/api/v1/activity?limit=5" \
  -H "Authorization: Bearer $OLIVIER_TOKEN")
echo "  Entrées dans le journal:"
echo $ACTIVITY | python3 -c "
import sys,json
d=json.load(sys.stdin)
for log in d.get('logs',[])[:5]:
    actor = log.get('actor',{})
    actor_name = f\"{actor.get('firstName','')} {actor.get('lastName','')}\".strip() or actor.get('username','')
    print(f\"    - {actor_name} {log.get('action','')} '{log.get('entityTitle','')}'\")
"

# 14. Olivier modifie les permissions (retire le droit de supprimer)
echo ""
echo "14. Olivier modifie les permissions de Pina..."
UPDATE_PERM=$(curl -s -X PUT "http://localhost:3000/api/v1/delegations/$DELEGATION_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OLIVIER_TOKEN" \
  -d '{"canDeleteTasks":false}')
echo "  canDeleteTasks maintenant: $(echo $UPDATE_PERM | python3 -c "import sys,json; print(json.load(sys.stdin).get('delegation',{}).get('canDeleteTasks',''))")"

# 15. Pina essaie de supprimer une tâche (devrait échouer)
echo ""
echo "15. Pina essaie de supprimer la tâche (devrait échouer)..."
DELETE_ATTEMPT=$(curl -s -X DELETE "http://localhost:3000/api/v1/tasks/$TASK_ID" \
  -H "Authorization: Bearer $PINA_TOKEN")
echo "  Résultat: $(echo $DELETE_ATTEMPT | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error','Supprimé!'))")"

echo ""
echo "=== Tests terminés ==="
