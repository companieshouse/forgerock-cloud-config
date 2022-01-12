var _scriptName = 'CH MFA SUB-FLOW SETUP';
_log('Starting');

var journeyName = _getJourneyName();
_log('Setup for Journey Name : ' + journeyName);

var config = {
  otpCheckStageNameVariable: 'otpCheckStageName'
};

var NodeOutcome = {
  DEFAULT: 'default',
  FORCE_EMAIL: 'forceEmail',
  FORCE_TEXT: 'forceText'
};

var useStageName = 'GENERIC_ERROR';
var useOutcome = NodeOutcome.DEFAULT;

var isRegistrationMFA = sharedState.get('registrationMFA');
_log('Is Registration MFA : ' + isRegistrationMFA);

var sharedStateMfaRoute = sharedState.get('mfa-route');
_log('Shared State MFA route : ' + sharedStateMfaRoute);

if (journeyName === 'CHChangePhoneNumber') {
  useStageName = 'UPDATE_PHONE_2';
  useOutcome = NodeOutcome.FORCE_TEXT;
} else if (journeyName === 'CHChangeEmailAddress') {
  useStageName = 'CHANGE_EMAIL_INPUT';
  useOutcome = NodeOutcome.FORCE_EMAIL;
} else if (journeyName === 'CHResetPassword' && ('sms' === sharedStateMfaRoute)) {
  useStageName = 'RESET_PASSWORD_3';
  useOutcome = NodeOutcome.FORCE_TEXT;
} else if (journeyName === 'CHResetPassword' && ('email' === sharedStateMfaRoute)) {
  useStageName = 'RESET_PASSWORD_3';
  useOutcome = NodeOutcome.FORCE_EMAIL;
} else if (journeyName === 'CHWebFiling-Login' && isRegistrationMFA) {
  // Complete Profile
  useStageName = 'PHONE_OTP';
  useOutcome = NodeOutcome.FORCE_TEXT;
} else if (journeyName === 'CHWebFiling-Login') {
  useStageName = 'EWF_LOGIN_OTP';
  useOutcome = NodeOutcome.DEFAULT;
} else if (journeyName === 'CHRegistration') {
  useStageName = 'REGISTRATION_MFA';
  useOutcome = NodeOutcome.FORCE_TEXT;
} else if (journeyName === 'CHSCRSActivation' && isRegistrationMFA) {
  // Complete Profile (SCRS)
  useStageName = 'PHONE_OTP';
  useOutcome = NodeOutcome.FORCE_TEXT;
} else if (journeyName === 'CHSCRSActivation') {
  useStageName = 'EWF_LOGIN_OTP';
  useOutcome = NodeOutcome.DEFAULT;
} else if (journeyName === 'CHOnboarding') {
  useStageName = 'EWF_LOGIN_OTP';
  useOutcome = NodeOutcome.FORCE_TEXT;
}

sharedState.put(config.otpCheckStageNameVariable, useStageName);
outcome = useOutcome;

_log('Outcome = ' + _getOutcomeForDisplay() + ', ' + config.otpCheckStageNameVariable + ' = ' + useStageName);

// LIBRARY START
// LIBRARY END