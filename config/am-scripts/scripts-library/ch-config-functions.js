function _fromConfig (configElement) {
  var _CONFIG_FIDC_ENDPOINT = 'https://openam-companieshouse-uk-dev.id.forgerock.io';
  var _CONFIG_NOTIFY_EMAIL_ENDPOINT = 'https://api.notifications.service.gov.uk/v2/notifications/email';
  var _CONFIG_NOTIFY_SMS_ENDPOINT = 'https://api.notifications.service.gov.uk/v2/notifications/sms';
  var _CONFIG_VALIDATE_SERVICE_SECRET_ENDPOINT = 'https://btazausqwf.execute-api.eu-west-2.amazonaws.com/cidev/';

  const allConfigItems = {
    _ITEM_FIDC_ENDPOINT: _CONFIG_FIDC_ENDPOINT,
    _ITEM_NOTIFY_EMAIL_ENDPOINT: _CONFIG_NOTIFY_EMAIL_ENDPOINT,
    _ITEM_NOTIFY_SMS_ENDPOINT: _CONFIG_NOTIFY_SMS_ENDPOINT,
    _ITEM_VALIDATE_SERVICE_SECRET_ENDPOINT: _CONFIG_VALIDATE_SERVICE_SECRET_ENDPOINT
  };

  return allConfigItems['_ITEM_' + configElement] || ('Unknown config item : ' + configElement);
}