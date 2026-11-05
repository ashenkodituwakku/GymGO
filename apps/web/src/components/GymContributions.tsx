import Link from 'next/link';
import { can, type ModerationStatus, type User } from '@gymgo/domain';
import { ContributionForm } from './ContributionForm';

/**
 * Everything a reader can contribute about one gym.
 *
 * The controls shown here follow the same permission rules the server
 * enforces, so the interface does not offer something that would be refused.
 * Hiding a control is a courtesy, though — every one of these posts is checked
 * again on the server.
 */
export function GymContributions({
  gymId,
  gymName,
  slug,
  offers,
  equipmentTypes,
  reviews,
  user,
  authEnabled,
}: {
  gymId: string;
  gymName: string;
  slug: string;
  offers: Array<{ id: string; label: string }>;
  equipmentTypes: Array<{ id: string; label: string }>;
  reviews: Array<{
    id: string;
    status: ModerationStatus;
    overall: number;
    authorDisplayName: string;
    hasOwnerReply: boolean;
  }>;
  user: User;
  authEnabled: boolean;
}) {
  const returnTo = `/gym/${slug}`;
  const signedIn = user.role !== 'anonymous';
  const isOwnerHere = can(user, 'gym.edit', { gymId });
  const ownPending = reviews.filter((review) => review.status === 'pending');

  return (
    <section aria-labelledby="contribute" className="stack">
      <h2 id="contribute">Help keep this accurate</h2>

      {!signedIn && (
        <p className="notice small">
          {authEnabled ? (
            <>
              <Link href="/account">Sign in</Link> to suggest a correction, leave a review or claim
              this gym. Browsing, filtering, comparing and saving all work without an account.
            </>
          ) : (
            <>
              Contributions need an account, and sign-in is not enabled in this environment.
              Browsing, filtering, comparing and saving all still work.
            </>
          )}
        </p>
      )}

      <details className="disclosure">
        <summary>Suggest a correction</summary>
        {signedIn ? (
          <ContributionForm
            action="/api/v1/corrections"
            submitLabel="Send correction"
            hiddenValues={{ gymId, returnTo }}
            intro="Corrections go to a moderator. Nothing you send here changes the page on its own, and a pending correction never overwrites a fact we have confirmed."
            successMessage="Thank you. Your correction is queued for review, and you will see it in the change history if it is approved."
            fields={[
              {
                name: 'targetKind',
                label: 'What is wrong',
                type: 'select',
                required: true,
                options: [
                  { value: 'offer_price', label: 'A price' },
                  { value: 'visitor_hours', label: 'Visitor entry hours' },
                  { value: 'equipment', label: 'Equipment' },
                  { value: 'operating_status', label: 'The gym has closed or reopened' },
                  { value: 'offer_eligibility', label: 'Who a price applies to' },
                  { value: 'amenity', label: 'A facility' },
                  { value: 'contact_details', label: 'Contact details' },
                  { value: 'other', label: 'Something else' },
                ],
              },
              {
                name: 'targetId',
                label: 'Which item',
                type: 'select',
                hint: 'Choosing a specific price or piece of equipment lets an approval update it directly. Leave it blank and the correction is published beside the fact instead.',
                options: [
                  { value: '', label: 'Not specific to one item' },
                  ...offers.map((offer) => ({ value: offer.id, label: `Price: ${offer.label}` })),
                  ...equipmentTypes.map((type) => ({ value: type.id, label: `Equipment: ${type.label}` })),
                ],
              },
              {
                name: 'newPrice',
                label: 'New price in A$, if you chose a price',
                type: 'number',
                min: 0,
                hint: 'Used only when the item above is a price.',
              },
              {
                name: 'presence',
                label: 'Equipment: is it there?',
                type: 'select',
                options: [
                  { value: '', label: 'Not applicable' },
                  { value: 'yes', label: 'Yes, it is there' },
                  { value: 'no', label: 'No, it is not there' },
                ],
              },
              {
                name: 'maxWeightKg',
                label: 'Equipment: heaviest dumbbell pair (kg)',
                type: 'number',
                min: 1,
                max: 100,
              },
              {
                name: 'proposedValue',
                label: 'What it should say',
                type: 'textarea',
                required: true,
              },
              {
                name: 'evidenceNote',
                label: 'How do you know?',
                type: 'textarea',
                required: true,
                hint: 'Shown to moderators, not published. Do not include anything you would not want a stranger to read.',
              },
              {
                name: 'evidenceUrl',
                label: 'A link supporting it',
                type: 'url',
              },
            ]}
          />
        ) : (
          <p className="small muted">You need an account to suggest a correction.</p>
        )}
      </details>

      <details className="disclosure">
        <summary>Write a review</summary>
        {signedIn ? (
          ownPending.length > 0 ? (
            <p className="small muted">
              You have a review waiting for moderation on this gym.
            </p>
          ) : (
            <ContributionForm
              action="/api/v1/reviews"
              submitLabel="Submit review"
              hiddenValues={{ gymId, returnTo }}
              intro="Reviews are held until a moderator reads them. Telling us you visited is not proof that you did, so no review here carries a verified badge."
              successMessage="Thank you. Your review is waiting for moderation."
              fields={[
                { name: 'overall', label: 'Overall', type: 'rating', required: true },
                { name: 'equipment', label: 'Equipment', type: 'rating' },
                { name: 'cleanliness', label: 'Cleanliness', type: 'rating' },
                { name: 'atmosphere', label: 'Atmosphere', type: 'rating' },
                { name: 'value', label: 'Value', type: 'rating' },
                { name: 'body', label: 'What was it like to train there?', type: 'textarea', required: true },
                { name: 'visitedOn', label: 'When did you visit?', type: 'date' },
              ]}
            />
          )
        ) : (
          <p className="small muted">You need an account to leave a review.</p>
        )}
      </details>

      <details className="disclosure">
        <summary>Report this listing</summary>
        <ContributionForm
          action="/api/v1/reports"
          submitLabel="Report"
          hiddenValues={{ subjectType: 'gym', subjectId: gymId, returnTo }}
          intro="Tell us if this listing is wrong in a way a correction cannot fix, or if it should not be here at all."
          successMessage="Thank you. A moderator will look at this."
          fields={[{ name: 'reason', label: 'What is the problem?', type: 'textarea', required: true }]}
        />
      </details>

      <details className="disclosure">
        <summary>{isOwnerHere ? `You manage ${gymName}` : 'Do you run this gym?'}</summary>
        {!signedIn ? (
          <p className="small muted">You need an account to claim a gym.</p>
        ) : isOwnerHere ? (
          <div className="stack stack--tight">
            <p className="small muted">
              Your claim on this branch has been approved. You can submit updates, which still go to
              moderation, and reply to reviews. You cannot remove a review about your gym, and
              approval of your claim did not mark any fact here as verified.
            </p>
            {reviews.filter((review) => review.status === 'published' && !review.hasOwnerReply).length > 0 ? (
              <ContributionForm
                action="/api/v1/owner/replies"
                submitLabel="Post reply"
                hiddenValues={{ gymId, returnTo }}
                intro="Your reply is published once a moderator approves it."
                successMessage="Your reply has been submitted for moderation."
                fields={[
                  {
                    name: 'reviewId',
                    label: 'Which review',
                    type: 'select',
                    required: true,
                    options: reviews
                      .filter((review) => review.status === 'published' && !review.hasOwnerReply)
                      .map((review) => ({
                        value: review.id,
                        label: `${review.overall}/5 from ${review.authorDisplayName}`,
                      })),
                  },
                  { name: 'body', label: 'Your reply', type: 'textarea', required: true },
                ]}
              />
            ) : (
              <p className="small muted">There are no published reviews awaiting a reply.</p>
            )}
          </div>
        ) : (
          <ContributionForm
            action="/api/v1/claims"
            submitLabel="Submit claim"
            hiddenValues={{ gymId, returnTo }}
            intro="Submitting a claim grants nothing. An administrator checks the evidence before your account can submit changes for this branch, and approving a claim confirms who you are — it does not mark your prices or equipment as verified."
            successMessage="Your claim has been submitted. An administrator will review the evidence. It grants no access until it is approved."
            fields={[
              { name: 'claimantName', label: 'Your name', type: 'text', required: true },
              { name: 'claimantRole', label: 'Your role at the gym', type: 'text', required: true },
              {
                name: 'evidenceType',
                label: 'How can we check?',
                type: 'select',
                required: true,
                options: [
                  { value: 'work_email_domain', label: 'An email address on the gym’s domain' },
                  { value: 'phone_callback', label: 'A callback to the number listed publicly' },
                  { value: 'business_document', label: 'A business document' },
                  { value: 'website_verification', label: 'A file or record we can place on the website' },
                ],
              },
              {
                name: 'evidenceRef',
                label: 'The detail we should use',
                type: 'text',
                required: true,
                hint: 'Kept private, shown only to administrators deciding the claim, and deleted with the claim. Never published.',
              },
            ]}
          />
        )}
      </details>
    </section>
  );
}
