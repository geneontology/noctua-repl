####
#### Just here to do some dev patching in some cases for rapid
#### development.
####

## Repo paths.
BBOP_MM ?= ../bbop-manager-minerva/


## Note, this is useful for ultra-fast prototyping, bypassing the
## necessary NPM steps for the server code.
.PHONY: patch-test-js
patch-test-js:
	cp $(BBOP_MM)/lib/manager.js node_modules/bbop-manager-minerva/lib/manager.js
##	gulp test
