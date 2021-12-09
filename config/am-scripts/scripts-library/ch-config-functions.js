var _CONFIG_FIDC_ENDPOINT = 'https://openam-companieshouse-uk-dev.id.forgerock.io';
var _CONFIG_NOTIFY_EMAIL_ENDPOINT = 'https://api.notifications.service.gov.uk/v2/notifications/email';
var _CONFIG_NOTIFY_SMS_ENDPOINT = 'https://api.notifications.service.gov.uk/v2/notifications/sms';
var _CONFIG_VALIDATE_SERVICE_SECRET_ENDPOINT = 'https://btazausqwf.execute-api.eu-west-2.amazonaws.com/cidev/';

function _fromConfig (configElement, defaultValue) {
  //const _CONFIG_FIDC_ENDPOINT = 'https://openam-companieshouse-uk-dev.id.forgerock.io';
  //const _CONFIG_NOTIFY_EMAIL_ENDPOINT = 'https://api.notifications.service.gov.uk/v2/notifications/email';
  //const _CONFIG_NOTIFY_SMS_ENDPOINT = 'https://api.notifications.service.gov.uk/v2/notifications/sms';
  //const _CONFIG_VALIDATE_SERVICE_SECRET_ENDPOINT = 'https://btazausqwf.execute-api.eu-west-2.amazonaws.com/cidev/';

  var allConfigItems = {
    _CONFIG_FIDC_ENDPOINT: _CONFIG_FIDC_ENDPOINT,
    _CONFIG_NOTIFY_EMAIL_ENDPOINT: _CONFIG_NOTIFY_EMAIL_ENDPOINT,
    _CONFIG_NOTIFY_SMS_ENDPOINT: _CONFIG_NOTIFY_SMS_ENDPOINT,
    _CONFIG_VALIDATE_SERVICE_SECRET_ENDPOINT: _CONFIG_VALIDATE_SERVICE_SECRET_ENDPOINT
  };

  return allConfigItems['_CONFIG_' + configElement] || '';
}