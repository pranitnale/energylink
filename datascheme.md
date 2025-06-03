Profiles

| Column           | Type          | Key / FK                     | Nullable? | Description                                                     |
| ---------------- | ------------- | ---------------------------- | --------- | --------------------------------------------------------------- |
| `id`             | `uuid`        | **PK**, FK → `auth.users.id` | NO        | One-to-one with Supabase auth user                              |
| `full_name`      | `text`        |                              | NO        | Display name                                                    |
| `contact_number` | `text`        |                              | Yes       | mobile number/ phone number                                     |
| `primary_role`   | `text[]`      |                              | NO        | Main role(s) (EPC, develope..)  - select from options           |
| `region_tags`    | `text[]`      |                              | YES       | Countries/region the user operates                              |
| `intent`         | `text[]`      |                              | NO        | hire / get_hired / collaborate                                  |
| `tech_tags`      | `text[]`      |                              | NO        | Tech expertise(solar, bess, wind,....)                          |
| `certifications` | `text[]`      |                              | YES       | NABCEP, ISO and related certifications                          |
| `availability`   | `int`         |                              | YES       | start date (slider in weeks)                                    |
| `languages`      | `text[]`      |                              | NO        | Spoken languages                                                |
| `ikigai`         | `jsonb`       |                              | YES       | passion, mission …                                              |
| `resume_text`    | `text`        |                              | YES       | Full-text index of CV                                           |
| `created_at`     | `timestamptz` |                              | NO        | Default `now()`                                                 |
| `updated_at`     | `timestamptz` |                              | NO        | On update trigger                                               |
| `experience`     | `text`        |                              | NO        | Experience of partners, focusing on acheivements, past projects |

Queries

| Column               | Type          | Key                  | Nullable? | Description     |
| -------------------- | ------------- | -------------------- | --------- | --------------- |
| `id`                 | `uuid`        | **PK**               | NO        | Query UID       |
| `user_id`            | `uuid`        | FK → `auth.users.id` | NO        | Seeker          |
| `query_text`         | `text`        |                      | NO        | Raw NL input    |
| `structured_payload` | `jsonb`       |                      | NO        | Parsed fields   |
| `created_at`         | `timestamptz` |                      | NO        | Default `now()` |

Query matches

| Column       | Type          | Key                           | Nullable? | Description                                                                                                                                              |
| ------------ | ------------- | ----------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | `uuid`        | **PK**                        | NO        | Internal row ID (generated `uuid_generate_v4()`)                                                                                                         |
| `query_id`   | `uuid`        | **UNIQUE**, FK → `queries.id` | NO        | 1-to-1 link to the seeker’s query                                                                                                                        |
| `matches`    | `jsonb`       |                               | NO        | **Ordered array** of match objects:`[{ "candidate_id": uuid, "total": int, "dimension": {A:4,B:5…}, "rationale": text }, …] , matches in decending order |
| `top_scores` | `int[]`       |                               | **YES**   | Parallel array of `total` scores (quick range/ORDER BY without JSON parsing)                                                                             |
| `created_at` | `timestamptz` |                               | NO        | Default `now()`                                                                                                                                          |

Saved profiles

| Column               | Type          | Key                     | Nullable? | Description        |
| -------------------- | ------------- | ----------------------- | --------- | ------------------ |
| `id`                 | `uuid`        | **PK**                  | NO        | Save UID           |
| `seeker_id`          | `uuid`        | FK → `auth.users.id`    | NO        | Who saved          |
| `candidate_id`       | `uuid`        | FK → `profiles.id`      | NO        | Saved profile      |
| `query_match_id`     | `uuid`        | FK → `query_matches.id` | NO        | Snapshot source    |
| `snapshot_score`     | `int`         |                         | NO        | Frozen total score |
| `snapshot_rationale` | `text`        |                         | NO        | Frozen rationale   |
| `saved_at`           | `timestamptz` |                         | NO        | Default `now()`    |

Chat

| Column       | Type          | Key                  | Nullable? | Description                           |
| ------------ | ------------- | -------------------- | --------- | ------------------------------------- |
| `id`         | `uuid`        | **PK**               | NO        | Chat-room ID (generated UUID)         |
| `is_group`   | `boolean`     |                      | NO        | `TRUE` = group chat, `FALSE` = 1-to-1 |
| `created_by` | `uuid`        | FK → `auth.users.id` | NO        | User who created the room             |
| `created_at` | `timestamptz` |                      | NO        | Creation timestamp (`now()`)          |

Messages

| Column       | Type          | Key                  | Nullable? | Description                          |
| ------------ | ------------- | -------------------- | --------- | ------------------------------------ |
| `id`         | `uuid`        | **PK**               | NO        | Message ID (generated UUID)          |
| `chat_id`    | `uuid`        | FK → `chats.id`      | NO        | Conversation this message belongs to |
| `sender_id`  | `uuid`        | FK → `auth.users.id` | NO        | Author of the message                |
| `body`       | `text`        |                      | NO        | Message text                         |
| `created_at` | `timestamptz` |                      | NO        | Timestamp (`now()`)                  |

Chat_members

| Column    | Type   | Key                          | Nullable? | Description      |
| --------- | ------ | ---------------------------- | --------- | ---------------- |
| `chat_id` | `uuid` | **PK**, FK → `chats.id`      | NO        | Room ID          |
| `user_id` | `uuid` | **PK**, FK → `auth.users.id` | NO        | Member (user) ID |

Relationship:

| Parent Table ➜ Child Table              | Cardinality | Notes                                                    |
| --------------------------------------- | ----------- | -------------------------------------------------------- |
| `auth.users` ➜ `profiles`               | **1 : 1**   | Shared primary key (`uuid`).                             |
| `auth.users` ➜ `queries`                | **1 : N**   | A seeker can issue many queries.                         |
| `queries` ➜ `query_matches`             | **1 : 1**   | Each query yields one json of candidate rows from query. |
| `profiles` ➜ `query_matches`            | **1 : N**   | A profile may appear in many matches.                    |
| `query_matches` ➜ `saved_profiles`      | **1 : N**   | Snapshot row when a match is saved.                      |
| `auth.users` ➜ `saved_profiles`         | **1 : N**   | User can bookmark many profiles.                         |
| `auth.users` ➜ `chats` (`created_by`)   | **1 : N**   | A user can create many chat rooms.                       |
| `chats` ➜ `chat_members`                | **1 : N**   | Participants per room.                                   |
| `auth.users` ➜ `chat_members`           | **1 : N**   | A user can belong to many rooms.                         |
| `chats` ➜ `messages`                    | **1 : N**   | Messages per conversation.                               |
| `auth.users` ➜ `messages` (`sender_id`) | **1 : N**   | Messages authored by a user.                             |
