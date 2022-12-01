var _scriptName = 'CH CALLBACK PROMPT FOR VALIDATE CREDENTIAL';
_log('Starting', 'MESSAGE');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.NameCallback
);

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.NameCallback('Enter Credential')
  ).build();
} else {
  sharedState.put('credential', callbacks.get(0).getName());
  action = fr.Action.goTo('true').build();
}

// LIBRARY START
// LIBRARY END