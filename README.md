= Overview =

  This is a REPL environment for the [[https://github.com/geneontology/noctua][Noctua]] annotation tool. This gets
  you some nice things:

  1) You don't have to wait until UI functionality makes it into the
     graph (or some other) editor--if the low-level API is capable of
     expressing it, you can easily do it in the REPL.
   
  2) For some operations, it is easier to express them succinctly with
     commands rather than work with a UI.

  3) An extremely easy way of prototyping new functionality.

  4) Spooky action at a distance.

= Usage =

  Given that you have logged in to a Noctua instance, look at the URL
  and copy your token (the variable is "barista_token").

  Know your target installation well enough to know where your Barista
  is hiding. Copy that URL down.

  You might also need to know your Barista definition--is defaults to
  "minerva_local".

  Should then be as simple as:

  : npm install
  : node ./bin/noctua-repl.js --token=xyz321abc987 --barista http://127.0.0.1:3400

  See the examples section for more information.

= Examples =

== CLI examples ==

   Connect to a local server with:

   : ~/local/src/git/noctua-repl$:) reset && node ./bin/noctua-repl.js --token=123 --barista http://localhost:3400

   Connection to labs with:

   : ~/local/src/git/noctua-repl$:) reset && node ./bin/noctua-repl.js --token=123 --server http://toaster.lbl.gov:3399 --definition minerva_public_dev

   Connect to a local server and dump meta-information to a file using
   CLI:

   : ~/local/src/git/noctua-repl$:) reset && node ./bin/noctua-repl.js --token=123 --server http://localhost:3400 --definition minerva_local --command "get_meta(); show(response)" > /tmp/foo.txt

   Connect to a local server local and dump meta-information to a file
   using a script:

   : ~/local/src/git/noctua-repl$:) reset && node ./bin/noctua-repl.js --token=123 --server http://localhost:3400 --definition minerva_local --file ./scripts/run-script-test.repl.js > /tmp/bar.txt

== REPL examples ==

   Get all of the meta-information for the current instance.

   : get_meta()

   Assign environment to a known model, then add a couple of new
   individuals to it.

   : model_id = 'gomodel:taxon_9606-5539842e0000002'
   : add_individual('GO:0022008')
   : add_individual(intersection(['GO:0022008', 'GO:0008150']))

   Add a new model, which gets the default assignment when done. Then
   add two new individuals as arguments to a new fact.

   : add_model()
   : var r = new_request_set()
   : r.add_fact([r.add_individual('GO:0022008'), r.add_individual('GO:0008150'), 'part_of'] )
   : request_with(r)

= API/Objects =

  This is a list of symbols that are defined or used in the
  REPL/scripting environment beyond what comes with node. Remember
  that you can do any of the normal things that you might want in this
  environment--it's just node!

  Helpers.

  - 'bbop' the bbop-core package
  - 'us' underscore
  - 'manager' the bbop-rest-manager with bbop-reponse-minerva
  - 'show' function to display objects more intelligently

  Auto-variables--these are attempted to be sent after every call.

  - 'token'
  - 'model'
  - 'model_id'
  - 'request_set'
  - 'response'
  - 'query_url'

  Class expressions--package class-expression.

  - 'union'
  - 'intersection'
  - 'svf'
  - 'cls'

  Manager actions--these are manager functions mapped up to the top-level.

  - 'get_meta'
  - 'get_model'
  - 'add_model'
  - 'save_model'
  - 'add_individual'
  - 'new_request_set'
  - 'request_with'

  Bigger fun function macros.

  - 'show_models'
  - 'show_response'

= Limitations/TODOs =

  We're actually feeling pretty good about this right now. Let us
  know.
