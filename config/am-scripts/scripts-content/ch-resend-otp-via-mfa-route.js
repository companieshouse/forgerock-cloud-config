var _scriptName = 'CH RESEND OTP VIA MFA';
_log('Starting');

var NodeOutcome = {
  SMS: 'sms',
  EMAIL: 'email',
  UNKNOWN: 'unknown'
};

var mfaRoute = sharedState.get('mfa-route');
_log('Shared State MFA Route = ' + mfaRoute);

if ('sms' === mfaRoute) {
  outcome = NodeOutcome.SMS;
} else if ('email' === mfaRoute) {
  outcome = NodeOutcome.EMAIL;
} else {
  outcome = NodeOutcome.UNKNOWN;
}

_log('Outcome = ' + _getOutcomeForDisplay());

// LIBRARY START
// LIBRARY END