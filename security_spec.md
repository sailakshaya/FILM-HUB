# Security Specification (TDD) for FILM HUB

## 1. Data Invariants
1. **Profile Identity Integrity**: A user's profile ID inside `/profiles/{userId}` must exactly match the authenticated `request.auth.uid`. No user can create or update a profile for any other UID.
2. **Profile Write Restrictions**: Only profile owners can write/update their profile document.
3. **Project Ownership**: Only Producers/Directors (identified by creating a project) can write, update, or delete the project document.
4. **Project Access Read**: Projects are accessible only to the Creator (Producer) or crew members added to that project.
5. **Schedule Verification**: Schedules belong to a project. A schedule write/update can only be executed by the project owner (Creator/Producer).
6. **Schedule Access Read**: Schedules are readable only by the Project Owner (Producer) or added crew members.
7. **Temporal & Key Validation**: Timestamps like `createdAt` and `updatedAt` must be synchronized on-chain with `request.time`. No unlisted attributes ("ghost fields") are allowed.

---

## 2. The "Dirty Dozen" Payloads
These 12 payloads represent attempts by bad actors to circumvent our zero-trust system. Every one of them must return `PERMISSION_DENIED`.

### Payload 1: Profile Spoofing (Create profile under another UID)
- **Path**: `/profiles/victimuid123`
- **User**: `attackeruid456`
- **Data**: `{ "userId": "victimuid123", "name": "Fake Name", "role": "Cinematographer", "email": "victim@gmail.com", "createdAt": "request.time", "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 2: Ghost Role Promotion (Attacker promotes self to Admin/Producer in self-profile)
- **Path**: `/profiles/attackeruid`
- **User**: `attackeruid`
- **Data**: `{ "userId": "attackeruid", "name": "Attacker", "role": "Cinematographer", "email": "attacker@gmail.com", "isAdmin": true, "createdAt": "request.time", "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED` (due to tight keys: Map keys size matches schema exactly)

### Payload 3: Illegal Project Update (Non-owner attempts to rename a project)
- **Path**: `/projects/projectA` (owned by `producerA`)
- **User**: `maliciousCrew`
- **Data**: `{ "projectId": "projectA", "title": "Hacked Title", "producerId": "producerA", "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 4: Budget Hijack (Invited crew member attempts to increase department-wise budget)
- **Path**: `/projects/projectA`
- **User**: `invitedCrew` (who is listed on the crew members list but not owner)
- **Data**: `{ "projectId": "projectA", "title": "Project A", "producerId": "producerA", "totalBudget": 9999999, "departmentBudgets": { "Camera": 800000 }, "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED` (crew members cannot modify project files)

### Payload 5: Schedule Injection (Attacker schedules shoot in unrelated project)
- **Path**: `/schedules/scheduleAttacker1`
- **User**: `attacker`
- **Data**: `{ "scheduleId": "scheduleAttacker1", "projectId": "projectA", "date": "2026-06-01", "location": "Hollywood", "callTime": "09:00 AM", "createdAt": "request.time", "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED` (attacker does not own `projectA`)

### Payload 6: Spoofed Timestamp Creation (Using stale client clock instead of server clock)
- **Path**: `/profiles/user123`
- **User**: `user123`
- **Data**: `{ "userId": "user123", "name": "User One", "role": "Actor", "email": "user1@gmail.com", "createdAt": "2021-01-01T00:00:00Z", "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 7: Shadow Fields Injection on Project (Creating project with custom parameters)
- **Path**: `/projects/projectHacked`
- **User**: `producerA`
- **Data**: `{ "projectId": "projectHacked", "title": "Innocent Film", "producerId": "producerA", "ghostTracker": "maliciousPayloadData", "createdAt": "request.time", "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 8: Schedule Read Scraping (Unauthenticated user listing all production call times)
- **Path**: `/schedules` (Query all)
- **User**: `anonymous` (Unsigned in)
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 9: Empty ID Poisoning (Creating project with path containing special characters / dots)
- **Path**: `/projects/../attacker-shell`
- **User**: `producerA`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 10: Private Email Read Scraping (Listing private profiles without authentication)
- **Path**: `/profiles` (Query all)
- **User**: `anonymous`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 11: Immutable Field Mutation (Attempting to modify `createdAt` or `producerId` of project after creation)
- **Path**: `/projects/projectA`
- **User**: `producerA` (Owner trying to change `producerId`)
- **Data**: `{ "projectId": "projectA", "title": "Project A Updated", "producerId": "hackerUid", "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 12: Extreme String Injection (1MB Size abuse on string bio attribute)
- **Path**: `/profiles/user123`
- **User**: `user123`
- **Data**: `{ "userId": "user123", "name": "User One", "role": "Actor", "email": "user1@gmail.com", "bio": "[1000000 characters ...]", "createdAt": "request.time", "updatedAt": "request.time" }`
- **Expected Outcome**: `PERMISSION_DENIED` (due to `.size() <= 2000` limit on bio)

---

## 3. Test Runner Outline
Our firestore security rules must enforce all the above invariants. The matching validation rules in `firestore.rules` will be mapped specifically to block these exact payloads.
