Command Line Interface
===============
1. [Install the cli](#install-the-cli)
1. [Configure autocomplete](#configure-autocomplete)
1. [Commands](#commands)

# Install the cli
To install cli, you should type:
```sh
npm install oc -g
```

# Configure autocomplete
Autocomplete is supported for Mac and Linux.

To enable it in **zsh**, you should type:
```sh
echo '. <(oc --completion)' >> .zshrc
```

To enable it in **bash**, you should type:
```sh
oc --completion >> ~/oc.completion.sh
echo 'source ~/oc.completion.sh' >> .bash_profile
```

After enabling autocomplete you should reload the shell.

# Commands
When you type **oc** in your command line:
```sh
oc
```
you should get the list of available commands:

```sh
Usage: oc <command>

command
[commands-shortlist]

Hint: Run -h with any command to show the help
```
[command-detailed]

##dev

```sh
Usage: oc dev <dirName> [port]

Parameters: 

	dirName     The name of the directory to watch, where the components are stored
	port        The port where to start a local oc instance. Default 3000

Description: Runs a local oc test registry in order to develop and test components
```

