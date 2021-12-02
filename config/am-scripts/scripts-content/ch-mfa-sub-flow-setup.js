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

var useStageName = 'DEFAULT_OTP_STAGE_NAME';
var useOutcome = NodeOutcome.DEFAULT;

if (journeyName === 'CHChangePhoneNumber') {
  useStageName = 'UPDATE_PHONE_2';
  useOutcome = NodeOutcome.FORCE_TEXT;
}

sharedState.put(config.otpCheckStageNameVariable, useStageName);
outcome = useOutcome;

_log('Outcome = ' + _getOutcomeForDisplay() + ', ' + config.otpCheckStageNameVariable + ' = ' + useStageName);

// LIBRARY START
// LIBRARY END