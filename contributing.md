Contributing guidelines
=======================

Contributes are more than welcome! 

### Troubleshooting

If you find an issue, feel free to check the [issues](https://github.com/opentable/oc/issues) page, and open a new one if you need.

### Sending a Pull Request

If you want to send a Pull Request, ensure you join the conversation first on the [issues page](https://github.com/opentable/oc/issues)! This is to avoid multiple people working on the same thing. You can get in touch via the [chat](https://gitter.im/opentable/oc) too.

When preparing a pull request, ensure all the tests pass locally running `grunt test-local`. If you have admin rights, open a new branch on the upstream opentable repo.

### Publishing new version to npm

You need to be ebabled for doing this. 
* `master` should be all green. If not, make it green first.
* git checkout master
* git pull
* Run `grunt version:<versionType>` for new version.
** While on 0.X.X (not stable):
*** `grunt version:patch` for bugfixes, new features
*** `grunt version:minor` for all breaking changes
*** `grunt version:major` NOT YET. Still need to define milestones for 1.0.0.
* git add .
* git commit -m "\<new version\>"
* git push
* [sudo] npm publish .
