var _scriptName = 'CH CONFIRM REGISTRATION CHOICES';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  javax.security.auth.callback.ConfirmationCallback
);

var NodeOutcome = {
  CHANGE: 'change',
  CONTINUE: 'continue'
};

var CONTINUE_OPTION_INDEX = 0;

var objectAttributes = sharedState.get('objectAttributes');

 if (callbacks.isEmpty()) {
          action = fr.Action.send(
            new fr.HiddenValueCallback(
              'stage', 'REGISTRATION_CONFIRMATION'
            ),
            new fr.TextOutputCallback(
              fr.TextOutputCallback.INFORMATION,
              objectAttributes
            ),
            new fr.ConfirmationCallback(
                'Do you want to continue or change these details?',
                fr.ConfirmationCallback.INFORMATION,
                ['CONTINUE','CHANGE'],
                0
              ),
            new fr.HiddenValueCallback(
              'pagePropsJSON',
              objectAttributes
            )
          ).build();

        } else {
        _log('[TOPLEVEL] Confirm Registration Choices:  here here');
           var selectedIndex = callbacks.get(2).getSelectedIndex();
            _log('[TOPLEVEL] Confirm Registration Choices:  here here 1');
           if (selectedIndex === CONTINUE_OPTION_INDEX) {
               _log('[TOPLEVEL] Confirm Registration Choices: selected CONTINUE');
               outcome = NodeOutcome.CONTINUE;
             } else {
               _log('[TOPLEVEL] Confirm Registration Choices: selected CHANGE');
               outcome = NodeOutcome.CHANGE;
             }

        }


// LIBRARY START
// LIBRARY END
