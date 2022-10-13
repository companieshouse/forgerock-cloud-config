var _scriptName = 'CH UPDATE PWD CONFIRMATION';
_log('Starting');

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  SUCCESS: 'true'
};

var infoMessage = 'Your password has been changed successfully';

if (callbacks.isEmpty()) {

  action = fr.Action.send(
    new fr.TextOutputCallback(
      fr.TextOutputCallback.INFORMATION,
      infoMessage
    ),
    new fr.HiddenValueCallback(
      'pagePropsJSON',
      JSON.stringify({ 'bannerName': 'changePassword' })
    ),
    new fr.HiddenValueCallback(
      'stage',
      'SUCCESS_SIGNED_OUT'
    )
  ).build();
} else {
  action = fr.Action.goTo(NodeOutcome.SUCCESS).build();
}

// LIBRARY START
// LIBRARY END