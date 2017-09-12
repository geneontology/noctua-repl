# Overview

This is a REPL environment for the
[Noctua](https://github.com/geneontology/noctua) annotation tool. This
gets you some nice things:

1. You don't have to wait until UI functionality makes it into the graph (or some other) editor--if the low-level API is capable of expressing it, you can easily do it in the REPL.
2. For some operations, it is easier to express them succinctly with commands rather than work with a UI.
3. An extremely easy way of prototyping new functionality.
4. Spooky action at a distance.

# Usage

Given that you have logged in to a Noctua instance, look at the URL
and copy your token (the variable is "barista_token").

Know your target installation well enough to know where your Barista
is hiding. Copy that URL down.

You might also need to know your Barista definition--is defaults to
"minerva_local".

Should then be as simple as:

```bash
npm install
node ./bin/noctua-repl.js --token=xyz321abc987 --server http://127.0.0.1:3400
```

See the examples section for more information.

# Examples

## CLI examples

Connect to a local server with:
	
```bash	
~/local/src/git/noctua-repl$:) reset && node ./bin/noctua-repl.js --token=01234 --server http://localhost:3400
```

Connection to labs with:

```bash	
~/local/src/git/noctua-repl$:) reset && node ./bin/noctua-repl.js --token=01234 --server http://toaster.lbl.gov:3399 --definition minerva_public_dev
```

Connect to a local server and dump meta-information to a file using
CLI:

```bash	
~/local/src/git/noctua-repl$:) reset && node ./bin/noctua-repl.js --token=01234 --server http://localhost:3400 --definition minerva_local --command "get_meta(); show(response)" > /tmp/foo.txt
```

Connect to a local server local and dump meta-information to a file
using a script:

```bash	
~/local/src/git/noctua-repl$:) reset && node ./bin/noctua-repl.js --token=01234 --server http://localhost:3400 --definition minerva_local --file ./scripts/run-script-test.repl.js > /tmp/bar.txt
```

## REPL examples

Get all of the meta-information for the current instance.

```node
get_meta()
```

Assign environment to a known model, then add a couple of new
individuals to it.

```node
model_id = 'gomodel:taxon_9606-5539842e0000002'
add_individual('GO:0022008')
add_individual(intersection(['GO:0022008', 'GO:0008150']))
```

Add a new model, which gets the default assignment when done. Then
add two new individuals as arguments to a new fact.
	
```node
add_model()
var r = new_request_set()
r.add_fact([r.add_individual('GO:0022008'), r.add_individual('GO:0008150'), 'part_of'] )
request_with(r)
```

Two ways of moving a node remotely. The first is manually, using
barclient and telekinesis; gets very chatty.
	
```node
get_model('gomodel:567b544200000029')
barclient.telekinesis('gomodel:567b544200000029/567b544200000126', 100, 100)
```

The second way uses a helper wrapper.

```node
get_model('gomodel:5667fdd400000077')
// model.get_node('gomodel:5667fdd400000077/5667fdd400000347')
move_individual('gomodel:5667fdd400000077/5667fdd400000347', 100.0, 100.0)
```

Sending a general warning broadcast to all connected users. First, you
must connect. While this can be done manually without a model, we'll
grab a model first to make sure we have some connection. (The barista
client is designed around a per-model attitude.)
	
```node
get_model('gomodel:567b544200000029')
barclient.broadcast({"message_type": "warning","message":"The server will catch fire, please save!"})
```

Run SPARQL commands off of an endpoint of our choice.

```node
sparql.endpoint('https://query.wikidata.org/sparql')
sparql_template('../bbop-manager-sparql/examples/template-01.yaml', {pmid: '999'})
show(sparql_response.raw())
```

# API/Objects

This is a list of symbols that are defined or used in the
REPL/scripting environment beyond what comes with node. Remember that
you can do any of the normal things that you might want in this
environment--it's just node!

Helpers.

- 'bbop' the bbop-core package
- 'us' underscore
- 'manager' the bbop-rest-manager with bbop-reponse-minerva
- 'show' function to display objects more intelligently

Auto-variables--these are attempted to be set after every call.

- 'token'
- 'model'
- 'model_id'
- 'request_set'
- 'response'
- 'query_url'

Class expressions--package class-expression.

* 'union'
* 'intersection'
* 'svf'
* 'cls'

Manager actions--these are manager functions mapped up to the top-level.

- 'get_meta'
- 'get_model'
- 'add_model'
- 'save_model'
- 'add_individual'
- 'new_request_set'
- 'request_with'

Bigger fun function macros.

- 'show_models' show summary information for all current models; can take a single string argument of "id", "title", "deprecated", "modified-p", "contributor", "model-state", or "date" for sorting
- 'show_response'
- 'silent' supress/re-enable the display of action results

# Limitations/TODOs

We're actually feeling pretty good about this right now. Let us know.
