# Lifeline Security Specification

## Data Invariants
1. **User Ownership**: A user can only create and access their own profile (except for limited visibility for doctors/admins).
2. **Analysis Integrity**: Medical analyses (symptoms, skin) must strictly belong to the user who performed them.
3. **Report Privacy**: Health reports contain PII and must only be readable by the owner or an admin.
4. **Consultation Roles**: Only the involved patient and doctor can access a consultation record.
5. **Role Mutation**: Users cannot change their own roles or promote themselves to admins.

## The "Dirty Dozen" Payloads (Anti-Patterns)

1. **Identity Spoofing**: Attempt to create a user profile with a UID that doesn't match the auth UID.
2. **Role Promotion**: Attempt to update `role` to 'admin' as a standard user.
3. **Cross-User Read**: Attempt to read another user's `healthReports`.
4. **Analysis Injection**: Attempt to create a `symptomsAnalyses` for another user.
5. **Ghost Field Update**: Attempt to add a `verified: true` field to a user profile that isn't in the schema.
6. **ID Poisoning**: Attempt to use a 1MB string as a document ID.
7. **Negative Timestamp**: Attempt to set `createdAt` to a date in the past (not using `request.time`).
8. **Consultation Hijack**: Attempt to update a consultation where the user is neither the doctor nor the patient.
9. **Unbounded Array**: Attempt to push 10,000 items into a `results` array in `symptomsAnalyses` (if we had array updates, but here we enforce it during create).
10. **State Shortcut**: Attempt to markers a consultation as 'completed' without being the assigned doctor.
11. **PII Scraping**: Attempt to list all `users` and their emails without filters.
12. **Orphaned Report**: Attempt to create a `healthReport` for a user ID that doesn't exist in the `users` collection.

## Test Strategy (Conceptual)
All the above payloads MUST return `PERMISSION_DENIED`.
Rules will enforce:
- `isOwner(userId)`
- `isValidId(id)`
- `isValidUser(data)`
- `isValidConsultation(data)`
- `affectedKeys().hasOnly(...)` during updates.
