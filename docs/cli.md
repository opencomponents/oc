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
dev - Runs a local oc test registry in order to develop and test components
info - Shows installed components on the current project
init - Creates a new empty component in the current folder
link - Links a component in the current project
ls - Shows the list of the available components for a linked oc registry
mock - Allows to mock configuration in order to facilitate local development
preview - Runs a test page consuming a component
publish - Publish a component
registry - Shows, adds, removes oc registries to the current project
unlink - Unlinks a component from the current project
version - Shows the cli version


Hint: Run -h with any command to show the help
```

##dev

```sh
Usage: oc dev <dirName> [port]

Parameters:

    dirName    The name of the directory to watch, where the components are stored
    port    The port where to start a local oc instance. Default 3000

Description: Runs a local oc test registry in order to develop and test components
```

##info

```sh
Usage: oc info

Parameters:


Description: Shows installed components on the current project
```

##init

```sh
Usage: oc init <componentName> [templateType]

Parameters:

    componentName    The name of the component to create
    templateType    The component' template type. Options are jade or handlebars (default).

Description: Creates a new empty component in the current folder
```

##link

```sh
Usage: oc link <componentName> [componentVersion]

Parameters:

    componentName    The name of the component to link. <oc ls> to see the list of available components
    componentVersion    The specific version of the component to link. Default is the latest

Description: Links a component in the current project
```

##ls

```sh
Usage: oc ls [registry]

Parameters:

    registry    Specify registry to query

Description: Shows the list of the available components for a linked oc registry
```

##mock

```sh
Usage: oc mock <targetType> <targetName> <targetValue>

Parameters:

    targetType    The type of item to mock
    targetName    The item to mock
    targetValue    The mocked value

Description: Allows to mock configuration in order to facilitate local development
```

##preview

```sh
Usage: oc preview <componentHref> [port]

Parameters:

    componentHref    The name of the component to preview
    port    The port where to start the server. Default 3000

Description: Runs a test page consuming a component
```

##publish

```sh
Usage: oc publish <componentPath>

Parameters:

    componentPath    The path of the component to publish

Description: Publish a component
```

##registry

```sh
Usage: oc registry <command> [parameter]

Parameters:

    command    Action: add, ls, or remove
    parameter    Parameter to perform the action

Description: Shows, adds, removes oc registries to the current project
```

##unlink

```sh
Usage: oc unlink <componentName>

Parameters:

    componentName    The name of the component to unlink. <oc info> to see the list of linked components

Description: Unlinks a component from the current project
```

##version

```sh
Usage: oc version

Parameters:


Description: Shows the cli version
```


##dev

```sh
Usage: oc dev <dirName> [port]

Parameters: 

	dirName     The name of the directory to watch, where the components are stored
	port        The port where to start a local oc instance. Default 3000

Description: Runs a local oc test registry in order to develop and test components
```

