Contributing guidelines
=======================

Contributes are more than welcome!

## Troubleshooting

If you find an issue, feel free to check the [issues](https://github.com/opencomponents/oc/issues) page, and open a new one if you need.

### Sending a Pull Request

If you want to send a Pull Request, ensure you join the conversation first on the [issues page](https://github.com/opencomponents/oc/issues)! This is to avoid multiple people working on the same thing. You can get in touch via the [chat](https://gitter.im/opentable/oc) too.

When preparing a pull request, ensure all the tests pass locally running `npm test`. If you have write/admin access, do it on a new branch on the upstream opencomponents repo. This allows all the test to run smoothly.

A couple of coding rules:
- never play with git history
- don't auto-merge
- merge only when tests are all green

### Publishing new version to npm

You need to be enabled for doing this.
* `master` should be all green. If not, make it green first.
* git checkout master
* git pull --tags
* Run `npm run <versionType>` for new version.
  * While on 0.X.X (not stable):
    * `npm run publish-patch` for bugfixes, new features
    * `npm run publish-minor` for all breaking changes
    * `npm run publish-major` NOT YET. Still need to define milestones for 1.0.0.

## Code of Conduct

This Code of Conduct is adapted from [Rust's wonderful
CoC](http://www.rust-lang.org/conduct.html).

* We are committed to providing a friendly, safe and welcoming
  environment for all, regardless of gender, sexual orientation,
  disability, ethnicity, religion, or similar personal characteristic.
* Please avoid using overtly sexual nicknames or other nicknames that
  might detract from a friendly, safe and welcoming environment for
  all.
* Please be kind and courteous. There's no need to be mean or rude.
* Respect that people have differences of opinion and that every
  design or implementation choice carries a trade-off and numerous
  costs. There is seldom a right answer.
* Please keep unstructured critique to a minimum. If you have solid
  ideas you want to experiment with, make a fork and see how it works.
* We will exclude you from interaction if you insult, demean or harass
  anyone.  That is not welcome behavior. We interpret the term
  "harassment" as including the definition in the [Citizen Code of
  Conduct](http://citizencodeofconduct.org/); if you have any lack of
  clarity about what might be included in that concept, please read
  their definition. In particular, we don't tolerate behavior that
  excludes people in socially marginalized groups.
* Private harassment is also unacceptable. No matter who you are, if
  you feel you have been or are being harassed or made uncomfortable
  by a community member, please contact us at oc@opentable.com with a capture (log, photo, email) of
  the harassment if possible.  Whether you're a regular contributor or
  a newcomer, we care about making this community a safe place for you
  and we've got your back.
* Likewise any spamming, trolling, flaming, baiting or other
  attention-stealing behavior is not welcome.
* Avoid the use of personal pronouns in code comments or
  documentation. There is no need to address persons when explaining
  code (e.g. "When the developer")
