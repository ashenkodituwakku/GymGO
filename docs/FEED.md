# The friends' feed

Your friends' workouts, newest first, to like and comment on, with Pro's
Head to head beside it. Built on 23 November 2026 (Update 252), when the owner
asked for "a workout feed page where you can see all your friends workouts
like on hevy". It takes the shape of a training feed (a card per workout: who,
when, time, volume, sets, records, the exercises; likes and comments) in
GymGO's own look; nothing of Hevy's is copied.

## What people see

- **Feed** (sidebar → You → Feed; Profile → Friends → Feed; the Friends page).
  A card per workout: who and when, the workout's name, its time, volume,
  working sets and records, the first three exercises with their best set
  ("85 kg × 5") and any record ("Heaviest yet"), who liked it, and Like and
  Comment. "Show older workouts" pages back, twenty at a time.
- **A workout** (tap a card): every exercise and every set (W, 1, 2, D tags;
  RPE; a trophy on the set that made a record), the likes, and the comments
  with a box to add one. On a friend's: **Do this workout** (the same
  exercises, sets and reps as a workout to start; your weights come from your
  own log) and **Head to head with them**. On yours: **Hide from friends**,
  and a way to change the workout.
- **On your workouts**, at the top of the feed: who liked or commented on
  yours in the last 30 days, newest first, the ones since you last looked
  marked with a dot.
- **A friend's workouts**, on their page (Update 253): their latest, with a
  count and See all (the feed for just them). Your own includes hidden ones.
- **Muscle split** on a workout's page (Update 253): its sets shared among
  the muscles worked, main muscles counting fully and others half.
- **The gym** (Update 253): tagged while training (the chip under the title,
  Which gym?) or from Edit workout; shown on the card and the workout's page,
  which opens the gym.
- **Head to head** (Pro), on a friend's page: your best on every exercise
  you've both done beside theirs (heaviest lift, estimated 1-rep max, most
  reps at body weight), the one ahead marked. Free accounts see what it is
  and the way to Pro.

## Privacy

- **Sharing is off until you turn it on** (Feed → Share my workouts). The card
  that asks says plainly what friends see, ones already logged included,
  and what they never see.
- Friends, and only friends, then see a workout's name, when it was, how long,
  the exercises and sets, the volume and the records, and **the gym only when
  you tag one** (Update 253: the gym chip on a workout; workouts logged before
  then show none). **Never your notes** (the feed never sends them). The gym
  is named as GymGO knows it, never typed text.
- Any one workout can be hidden from friends (its page → Hide from friends);
  turning sharing off hides them all at once.
- Seeing friends' workouts doesn't need you to share yours.
- Ending a friendship removes each one's likes and comments on the other's
  workouts. Deleting a workout or an account deletes its likes and comments.
  Download my data includes your sharing setting, hidden workouts, likes,
  comments and reports.

## Comments and moderation

- A comment is up to 300 characters, between friends. Whoever wrote it, and
  whoever's workout it's on, can delete it; moderators can delete any
  (`DELETE /api/feed/comments/:id`).
- **Report** on someone else's comment sends it to the team as a report
  (emailed like bug reports, once per person per comment), with the comment,
  who wrote it and how a moderator deletes it.
- Limits: 60 comments and 300 likes an hour each, 10 reports a day.
- Blocking is unfriending: the feed is friends only, and a removed friend
  can't come back without your yes.

## For the owner: the Privacy Policy

The Privacy Policy says what friends see: "your display name, profile
picture, the cards in your collection with their visit counts, and your
totals". For anyone who turns sharing on, friends see their workouts too.
I haven't changed the legal pages, because that wording is yours to approve
(and changing them asks everyone to agree again). What would change:

- Privacy → what friends see: add "and, if you choose to share them, the
  workouts you log: their names, when, how long, the exercises, sets and
  records, and the gym when they tag one (never their notes); and the likes and comments on
  them".
- Privacy → what we keep: your choice to share workouts, which ones you've
  hidden, and the likes, comments and reports you make on friends' workouts,
  kept until you delete them, the workout goes, or the friendship ends.
- Community guidelines (if you want them to say so): comments on friends'
  workouts follow the same rules as reviews, and can be reported.

## How it's built

- `apps/server/src/feed.ts` (`Feed`): sharing (`users.share_workouts`), who
  sees what (your own, or an accepted friend's that they share and haven't
  hidden: `training_sessions.hidden`), pages by `finished_at|id`, records
  kept per workout (`training_sessions.records_json`, worked out with
  `recordsBroken` against the owner's earlier workouts and worked out again
  from a workout that's logged, changed or deleted onward), likes
  (`feed_likes`), comments (`feed_comments`), reports (`feed_reports`),
  activity, head to head (`personalRecords` on both logs, the friend's shared
  workouts only), `forgetBetween` on unfriending, `exportFor`.
- Routes (app.ts): `GET /api/feed?after=`, `GET /api/feed/:id`,
  `PUT|DELETE /api/feed/:id/like`, `POST /api/feed/:id/comments`,
  `DELETE /api/feed/comments/:id`, `POST /api/feed/comments/:id/report`,
  `GET /api/feed/compare/:friendId` (Pro), `PUT /api/me/sharing`, and
  `PATCH /api/training/:id { hidden }`.
- `packages/domain/src/lifting.ts`: what a workout is and its records
  (`personalRecords`, `recordsBroken`, `volumeKg`, `setCount`, `oneRepMax`),
  moved from the app's lib/training.ts so the server works them out the same
  way; the app re-exports them.
- The app: `lib/feed.ts` (when, who liked it, best set, volume, Head to head
  lines), `components/FeedCard.tsx`, `components/HeadToHead.tsx`,
  `app/feed/index.tsx`, `app/feed/[id].tsx`; the sidebar's Feed (Phosphor's
  pulse, whose line draws itself under the mouse).
- Tests: `apps/server/src/feed.test.ts` (11) and `apps/mobile/src/lib/feed.test.ts` (10).
