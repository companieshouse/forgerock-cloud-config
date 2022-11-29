var _scriptName = 'CH DISPLAY CONSENT RESPONSE SUCCESS URL';
_log('Starting');

/* WHY DO WE COME TO THIS NODE THAT GOES NOWHERE?
We can't allow the remote consent journey to end, or else the session created by the login journey will be destroyed
The remote consent journey uses the session created by the login journey to send a consent response in the previous step `Send Response` to am
Am responds back with a redirect uri with a authorization code which our custom ui uses to redirect the user back when executing this journey
If the remote consent journey is allowed to finish then the session created by the login journey will be destoryed and the authorization code in the redirect uri will be made invalid as the session it was linked to is gone
There may be a nicer way of doing this...
*/

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  javax.security.auth.callback.TextOutputCallback,
  com.sun.identity.authentication.callbacks.HiddenValueCallback
);

var NodeOutcome = {
  TRUE: 'true',
};

 var pagePropsJson = JSON.stringify({'successUrl': sharedState.get('successUrl') + "" })

    action = fr.Action.send(
      new fr.TextOutputCallback(
        fr.TextOutputCallback.INFORMATION,
        pagePropsJson
      ),
      new fr.HiddenValueCallback(
        'stage',
        'CONSENT_FINISH'
      ),
      new fr.HiddenValueCallback(
        'pagePropsJSON', pagePropsJson
      )
    ).build();


// LIBRARY START
// LIBRARY END