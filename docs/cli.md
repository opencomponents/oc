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
Runs a local oc test registry in order to develop and test components

Usage:
```sh
oc dev <dirName> [port]
```


Parameters:

|Name|Description|
|-|-|
|dirName|The name of the directory to watch, where the components are stored|
|port|The port where to start a local oc instance. Default 3000|

##info
Shows installed components on the current project

Usage:
```sh
oc info
```

##init
Creates a new empty component in the current folder

Usage:
```sh
oc init <componentName> [templateType]
```


Parameters:

|Name|Description|
|-|-|
|componentName|The name of the component to create|
|templateType|The component's template type. Options are jade or handlebars (default).|

##link
Links a component in the current project

Usage:
```sh
oc link <componentName> [componentVersion]
```


Parameters:

|Name|Description|
|-|-|
|componentName|The name of the component to link. <oc ls> to see the list of available components|
|componentVersion|The specific version of the component to link. Default is the latest|

##ls
Shows the list of the available components for a linked oc registry

Usage:
```sh
oc ls [registry]
```


Parameters:

|Name|Description|
|-|-|
|registry|Specify registry to query|

##mock
Allows to mock configuration in order to facilitate local development

Usage:
```sh
oc mock <targetType> <targetName> <targetValue>
```


Parameters:

|Name|Description|
|-|-|
|targetType|The type of item to mock|
|targetName|The item to mock|
|targetValue|The mocked value|

##preview
Runs a test page consuming a component

Usage:
```sh
oc preview <componentHref> [port]
```


Parameters:

|Name|Description|
|-|-|
|componentHref|The name of the component to preview|
|port|The port where to start the server. Default 3000|

##publish
Publish a component

Usage:
```sh
oc publish <componentPath>
```


Parameters:

|Name|Description|
|-|-|
|componentPath|The path of the component to publish|

##registry
Shows, adds, removes oc registries to the current project

Usage:
```sh
oc registry <command> [parameter]
```


Parameters:

|Name|Description|
|-|-|
|command|Action: add, ls, or remove|
|parameter|Parameter to perform the action|

##unlink
Unlinks a component from the current project

Usage:
```sh
oc unlink <componentName>
```


Parameters:

|Name|Description|
|-|-|
|componentName|The name of the component to unlink. <oc info> to see the list of linked components|

##version
Shows the cli version

Usage:
```sh
oc version
```

