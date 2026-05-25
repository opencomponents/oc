# Contributing guidelines

Contributes are more than welcome!

## Troubleshooting

If you find an issue, feel free to check the [issues](https://github.com/opencomponents/oc/issues) page, and open a new one if you need.

### Sending a Pull Request

If you want to send a Pull Request, ensure you join the conversation first on the [issues page](https://github.com/opencomponents/oc/issues)! This is to avoid multiple people working on the same thing. You can get in touch via the [chat](https://gitter.im/opentable/oc) too.

When preparing a pull request, ensure all the tests pass locally running `npm test`. If you have write/admin access, do it on a new branch on the upstream opencomponents repo. This allows all the test to run smoothly.

Pull requests should not include release/versioning changes (changesets, version bumps, publish steps) unless explicitly requested by the maintainer.

### Monorepo workflow

- Run repo-level commands from the repository root (`npm run lint`, `npm run build`, `npm run test`).
- The current workspace package is `packages/oc`.
- Turborepo orchestrates tasks across workspaces.
- Changesets are managed at repo root (`.changeset/`).

A couple of coding rules:

- never play with git history
- don't auto-merge
- merge only when tests are all green

### Publishing new version to npm

This section is maintainer-only.

Contributors sending pull requests are **not** required to add changesets or decide version bumps.

Versioning and publishing are managed independently from the pull request workflow by the maintainer.

- `master` should be all green. If not, make it green first.
- git checkout master
- git pull --tags
- Check pending releases:
  - `npm run changeset:status`
- Prepare release versions/changelog when needed:
  - `npm run release:prepare`
- Publish to npm when needed (will ask for OTP when needed):
  - `npm run release:publish`

`npm run release` runs both `release:prepare` and `release:publish`.

## Code of Conduct

This Code of Conduct is adapted from [Rust's wonderful
CoC](http://www.rust-lang.org/conduct.html).

- We are committed to providing a friendly, safe and welcoming
  environment for all, regardless of gender, sexual orientation,
  disability, ethnicity, religion, or similar personal characteristic.
- Please avoid using overtly sexual nicknames or other nicknames that
  might detract from a friendly, safe and welcoming environment for
  all.
- Please be kind and courteous. There's no need to be mean or rude.
- Respect that people have differences of opinion and that every
  design or implementation choice carries a trade-off and numerous
  costs. There is seldom a right answer.
- Please keep unstructured critique to a minimum. If you have solid
  ideas you want to experiment with, make a fork and see how it works.
- We will exclude you from interaction if you insult, demean or harass
  anyone. That is not welcome behavior. We interpret the term
  "harassment" as including the definition in the [Citizen Code of
  Conduct](http://citizencodeofconduct.org/); if you have any lack of
  clarity about what might be included in that concept, please read
  their definition. In particular, we don't tolerate behavior that
  excludes people in socially marginalized groups.
- Private harassment is also unacceptable. No matter who you are, if
  you feel you have been or are being harassed or made uncomfortable
  by a community member, please contact us at oc@opentable.com with a capture (log, photo, email) of
  the harassment if possible. Whether you're a regular contributor or
  a newcomer, we care about making this community a safe place for you
  and we've got your back.
- Likewise any spamming, trolling, flaming, baiting or other
  attention-stealing behavior is not welcome.
- Avoid the use of personal pronouns in code comments or
  documentation. There is no need to address persons when explaining
  code (e.g. "When the developer")
