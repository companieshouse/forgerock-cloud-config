var _scriptName = 'CH LOAD JWT KEYS';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action
);

var NodeOutcome = {
  SUCCESS: 'true',
  ERROR: 'false'
};

// This variable value will be replaced with the relevant value in the target environment (stored in AM secret store) 
var chJwtSigningKey = 'KLyM3tGMn0Efa0HmJfq3eJd4ZiHIDJ1/kNfUwDp9ofE=';
var chJwtEncryptionKey = '5ATJO3doZPqg6pP4rUzn78HRnjQBwkGK01BGBTYio/U=';

function saveState () {
  try {
    transientState.put('chJwtSigningKey', chJwtSigningKey);
    transientState.put('chJwtEncryptionKey', chJwtEncryptionKey);
  } catch (e) {
    _log('Error : Failed to set state - ' + e);
    return NodeOutcome.ERROR;
  }

  return NodeOutcome.SUCCESS;
}

action = fr.Action.goTo(saveState()).build();

_log('Exited');

// LIBRARY START
// LIBRARY END
